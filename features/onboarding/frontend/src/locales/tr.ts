import type { OnboardingResources } from "./en";

export const tr: OnboardingResources = {
  progress: {
    remaining: "{{total}} görevin {{remaining}} tanesi kaldı",
  },
  tasks: {
    "team-join": {
      title: "Bir takıma katılın veya takım oluşturun",
      description: "Takımınızı bulun veya mevcut değilse yeni bir takım talep edin.",
      ctaLabel: "Takım bulun",
    },
    fallbackCtaLabel: "Aç",
  },
  actions: {
    markDone: "Tamamlandı olarak işaretle",
    dismiss: "Yoksay",
  },
  empty: {
    allCaughtUp: "Her şey tamamdır.",
  },
  errors: {
    loadFailed: "Başlangıç görevleri yüklenemedi.",
  },
};
