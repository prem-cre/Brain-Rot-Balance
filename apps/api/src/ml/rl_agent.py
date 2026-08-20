import math
from typing import Any
from pydantic import BaseModel


class UserHabitContext(BaseModel):
    streak_days: int = 0
    spent_minutes_today: int = 0
    total_budget_minutes: int = 50
    quiz_pass_rate: float = 0.8
    completion_rate: float = 0.7


class RLPolicyRecommendation(BaseModel):
    action_id: int
    action_name: str
    reward_ratio_seconds: int  # Seconds of educational watch per +1m
    bonus_mastery_minutes: int
    recommendation_rationale: str
    confidence_score: float


class LinUCBHabitPolicyAgent:
    """Contextual Multi-Armed Bandit (LinUCB) for adaptive educational habit reinforcement.

    Dynamically optimizes earning ratios and quiz multipliers based on user cognitive fatigue,
    streak consistency, and video completion patterns.
    """

    ACTIONS = [
        {
            "id": 0,
            "name": "STANDARD_5_TO_1",
            "ratio_seconds": 300,
            "bonus_mastery": 5,
            "rationale": "Balanced mode: Standard 5:1 earning ratio for consistent habit building."
        },
        {
            "id": 1,
            "name": "BURNOUT_RELIEF_4_TO_1",
            "ratio_seconds": 240,
            "bonus_mastery": 5,
            "rationale": "Burnout relief: Accelerated 4:1 earning ratio to lower cognitive barrier when fatigue is elevated."
        },
        {
            "id": 2,
            "name": "MASTERY_CHALLENGE",
            "ratio_seconds": 300,
            "bonus_mastery": 7,
            "rationale": "Mastery challenge: Elevated +7m quiz jackpot to reward exceptional consistency and high streak."
        },
        {
            "id": 3,
            "name": "BITE_SIZED_RECOVERY",
            "ratio_seconds": 200,
            "bonus_mastery": 4,
            "rationale": "Bite-sized recovery: Fast micro-earning ratio to rebuild momentum after early drop-offs."
        }
    ]

    def __init__(self, feature_dim: int = 5, alpha: float = 0.3):
        self.d = feature_dim
        self.alpha = alpha
        self.num_actions = len(self.ACTIONS)

        # Initialize LinUCB state matrices: A_a = I (d x d), b_a = 0 (d x 1)
        self.A = [
            [[1.0 if i == j else 0.0 for j in range(self.d)] for i in range(self.d)]
            for _ in range(self.num_actions)
        ]
        self.b = [[0.0] * self.d for _ in range(self.num_actions)]

    def _extract_context_vector(self, ctx: UserHabitContext) -> list[float]:
        """Extracts normalized 5-dimensional feature context."""
        streak_norm = min(1.0, ctx.streak_days / 30.0)
        budget = max(1, ctx.total_budget_minutes)
        fatigue_norm = min(1.0, ctx.spent_minutes_today / budget)
        quiz_norm = max(0.0, min(1.0, ctx.quiz_pass_rate))
        completion_norm = max(0.0, min(1.0, ctx.completion_rate))
        return [1.0, streak_norm, fatigue_norm, quiz_norm, completion_norm]

    @staticmethod
    def _invert_matrix_5x5(A: list[list[float]]) -> list[list[float]]:
        """Computes Gauss-Jordan matrix inversion for 5x5 ridge regression matrix."""
        n = len(A)
        augmented = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(A)]

        for i in range(n):
            # Pivot
            pivot = augmented[i][i]
            if abs(pivot) < 1e-9:
                pivot = 1e-9
            for j in range(2 * n):
                augmented[i][j] /= pivot

            for k in range(n):
                if k != i:
                    factor = augmented[k][i]
                    for j in range(2 * n):
                        augmented[k][j] -= factor * augmented[i][j]

        return [row[n:] for row in augmented]

    def select_policy(self, ctx: UserHabitContext) -> RLPolicyRecommendation:
        """Selects optimal habit policy arm using Upper Confidence Bound."""
        x = self._extract_context_vector(ctx)
        best_action_idx = 0
        max_ucb_score = -float("inf")

        for a in range(self.num_actions):
            A_inv = self._invert_matrix_5x5(self.A[a])
            
            # theta = A_inv * b
            theta = [sum(A_inv[i][j] * self.b[a][j] for j in range(self.d)) for i in range(self.d)]
            
            # Mean expected reward: theta^T * x
            mean_reward = sum(theta[i] * x[i] for i in range(self.d))
            
            # Variance bound: sqrt(x^T * A_inv * x)
            var_term = sum(x[i] * sum(A_inv[i][j] * x[j] for j in range(self.d)) for i in range(self.d))
            var_term = math.sqrt(max(0.0, var_term))

            ucb_score = mean_reward + self.alpha * var_term

            if ucb_score > max_ucb_score:
                max_ucb_score = ucb_score
                best_action_idx = a

        action_def = self.ACTIONS[best_action_idx]
        return RLPolicyRecommendation(
            action_id=action_def["id"],
            action_name=action_def["name"],
            reward_ratio_seconds=action_def["ratio_seconds"],
            bonus_mastery_minutes=action_def["bonus_mastery"],
            recommendation_rationale=action_def["rationale"],
            confidence_score=round(min(0.99, max(0.60, 0.70 + 0.1 * max_ucb_score)), 3)
        )

    def update(self, ctx: UserHabitContext, action_id: int, reward: float):
        """Online Bayesian policy update using reward feedback."""
        if 0 <= action_id < self.num_actions:
            x = self._extract_context_vector(ctx)
            # A_a = A_a + x * x^T
            for i in range(self.d):
                for j in range(self.d):
                    self.A[action_id][i][j] += x[i] * x[j]
                # b_a = b_a + reward * x
                self.b[action_id][i] += reward * x[i]
