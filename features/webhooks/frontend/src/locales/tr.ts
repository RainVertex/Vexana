import type { WebhooksResources } from "./en";

export const tr: WebhooksResources = {
  page: {
    titleUser: "Webhook'larım",
    titleTeam: "Takım webhook'ları · {{slug}}",
    descriptionUser: "Size yönelik olaylar için giden webhook'lar.",
    descriptionTeam: "Bu takımın olayları için giden webhook'lar.",
    signatureNote:
      "Her teslimat, abonelik gizli anahtarı kullanılarak ham gövde üzerinden X-MEP-Signature: sha256=<hex> ile imzalanır. URL hooks.slack.com olduğunda Slack biçimli yük (text, blocks) otomatik olarak gönderilir, aksi takdirde yerel JSON kullanılır.",
  },
  form: {
    sectionTitle: "Yeni abonelik",
    urlLabel: "URL",
    urlPlaceholder: "https://hooks.slack.com/services/…",
    eventKindsLegend: "Olay türleri",
    createButton: "Oluştur",
  },
  secret: {
    banner: "Webhook oluşturuldu. Bu gizli anahtarı şimdi kaydedin:",
    dismiss: "Kapat",
  },
  list: {
    sectionTitle: "Mevcut abonelikler",
    loading: "Yükleniyor…",
    empty: "Henüz webhook yok.",
    disabledLabel: "devre dışı",
    sendPing: "Ping gönder",
    delete: "Sil",
  },
  alerts: {
    pingEnqueued: "Ping kuyruğa alındı, kısa süre içinde teslimat geçmişini kontrol edin.",
    deleteConfirm: "Bu webhook aboneliği silinsin mi?",
  },
  errors: {
    loadFailed: "Yüklenemedi",
    createFailed: "Oluşturma başarısız oldu",
    deleteFailed: "Silme başarısız oldu",
    testFailed: "Test başarısız oldu",
  },
};
