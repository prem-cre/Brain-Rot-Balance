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
      title: "System Design Deep Dive: Architecture Patterns",
      meta: "28 min • Systems Architecture",
      reward: "+1 min per 5m",
      videoId: "0O1w65c6c0E",
      watchUrl: "https://www.youtube.com/results?search_query=System+Design+Deep+Dive+Architecture"
    },
    {
      id: "vault-2",
      title: "React 19 & Next.js Full Course",
      meta: "19 min • Frontend Dev",
      reward: "+1 min per 5m",
      videoId: "TNhaISOUy6Q",
      watchUrl: "https://www.youtube.com/results?search_query=React+19+Tutorial+Full+Course"
    },
    {
      id: "vault-3",
      title: "Data Structures & Algorithms in Python",
      meta: "24 min • DSA Mastery",
      reward: "+1 min per 5m",
      videoId: "fAAZ2rCfc18",
      watchUrl: "https://www.youtube.com/results?search_query=NeetCode+Data+Structures+Algorithms+Python"
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
