export const defaultState = {
  wallet: {
    totalMinutes: 50,
    remainingMinutes: 12,
    earnedMinutes: 44,
    spentMinutes: 38,
    focusMode: false,
    streakDays: 12,
    learningConfidence: 0.93
  },
  session: {
    detectedIntent: "Mixed drift",
    prediction: "This session usually stretches to 43 minutes after 3 Shorts.",
    currentVideo: {
      title: "React Context API Explained in 14 Minutes",
      channel: "Frontend Forge",
      educationScore: 94,
      entertainmentScore: 18,
      status: "Learning-positive"
    }
  },
  dailyStats: {
    learningMinutes: 138,
    entertainmentMinutes: 42,
    focusMinutes: 51,
    knowledgeScore: 88
  },
  vault: [
    {
      id: "vault-1",
      title: "Docker Networking Deep Dive",
      meta: "28 min · Systems",
      reward: "+24 min"
    },
    {
      id: "vault-2",
      title: "React Hooks Through Real Examples",
      meta: "19 min · Frontend",
      reward: "+18 min"
    },
    {
      id: "vault-3",
      title: "Binary Search Trees Without Memorizing",
      meta: "24 min · DSA",
      reward: "+22 min"
    }
  ],
  insights: [
    {
      label: "Entertainment drag",
      value: "18 min",
      tone: "warning"
    },
    {
      label: "Recovered by learning",
      value: "44 min",
      tone: "success"
    },
    {
      label: "Top topic",
      value: "React",
      tone: "neutral"
    }
  ]
};
