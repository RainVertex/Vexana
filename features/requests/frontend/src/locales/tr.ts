import type { RequestsResources } from "./en";

export const tr: RequestsResources = {
  page: {
    myRequestsTitle: "Taleplerim",
    myRequestsDescription:
      "Gönderdiğiniz takım oluşturma ve bakımcı talepleri. Bekleyenler önce, geçmiş aşağıda.",
    myApprovalsTitle: "Onaylarım",
    myApprovalsDescription:
      "Kararınızı bekleyen talepler ve işlem yaptıklarınız. Bekleyenler önce.",
  },
  sections: {
    teamCreation: "Takım oluşturma talepleri",
    maintainer: "Bakımcı talepleri",
  },
  chips: {
    team: "Takım",
    maintainer: "Bakımcı",
  },
  status: {
    teamPendingAdmin: "Yönetici incelemesi bekleniyor",
    teamAwaitingUser: "Sizin incelemeniz bekleniyor",
    teamApproved: "Onaylandı",
    teamRejected: "Reddedildi",
    teamExpired: "Süresi doldu",
    teamCancelled: "İptal edildi",
    maintainerPending: "İnceleme bekleniyor",
    maintainerApproved: "Onaylandı",
    maintainerRejected: "Reddedildi",
    maintainerExpired: "Süresi doldu",
    maintainerCancelled: "İptal edildi",
  },
  time: {
    expired: "süresi doldu",
    daysRemaining: "{{count}} gün kaldı",
    hoursRemaining: "{{count}} saat kaldı",
  },
  labels: {
    round: "{{current}}. tur, toplam {{total}}",
    submitted: "{{date}} tarihinde gönderildi",
    reason: "Gerekçe",
    rejected: "Reddedildi: {{reason}}",
    reviewedBy: "{{name}} tarafından",
    mirrorGithub: "GitHub organizasyonuna yansıt: {{org}}",
    autoCancelledRounds: "3 tur müzakerenin ardından otomatik iptal edildi.",
  },
  actions: {
    approve: "Onayla",
    reject: "Reddet",
    cancel: "İptal et",
    confirm: "Onayla",
    openInAdmin: "Yönetimde aç",
    openTeam: "Takımı aç →",
  },
  dialogs: {
    cancelTeamTitle: "Takım talebi iptal edilsin mi?",
    cancelTeamMessage:
      '"{{name}}" ({{slug}}) yönetici kuyruğunda artık görünmeyecek. Daha sonra yeniden gönderebilirsiniz.',
    cancelMaintainerTitle: "Bakımcı talebi iptal edilsin mi?",
    cancelMaintainerMessage:
      '"{{teamName}}" takımı için bakımcı olma talebiniz geri çekilecek. Daha sonra yeniden gönderebilirsiniz.',
    cancelRequestLabel: "Talebi iptal et",
    keepItLabel: "Vazgeç",
  },
  empty: {
    noRequests: "Henüz hiçbir takım veya bakımcı talebi göndermediniz.",
    nothingPending: "Sizi bekleyen bir şey yok.",
  },
  loading: "Yükleniyor…",
  errors: {
    failedToLoad: "Yüklenemedi",
    failedToLoadTeam: "Takım talepleri yüklenemedi",
    approvalFailed: "Onaylama başarısız oldu",
    rejectionFailed: "Reddetme başarısız oldu",
    cancelFailed: "İptal başarısız oldu",
    confirmFailed: "Onaylama başarısız oldu",
  },
};
