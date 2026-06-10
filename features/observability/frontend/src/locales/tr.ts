import type { ObservabilityResources } from "./en";

export const tr: ObservabilityResources = {
  page: {
    title: "Gözlemlenebilirlik",
    description: "Servis sağlığı, günlükler, Grafana uyarıları ve pano gömmesi.",
    configure: "Yapılandır",
    configTitle: "Gözlemlenebilirlik yapılandırması",
    configDescription:
      "Varlık başına PromQL / LogQL / pano bağlantısı. Boş alanlar, yer tutucu olarak gösterilen varsayılanlara döner.",
  },
  tabs: {
    health: "Sağlık",
    logs: "Günlükler",
    alerts: "Uyarılar",
    dashboards: "Panolar",
  },
  fields: {
    entityId: "Varlık kimliği",
    entityIdPlaceholder: "katalog varlık kimliği",
    dashboardUid: "Pano UID",
    panelId: "Panel ID",
    grafanaIntegration: "Grafana entegrasyonu",
    upQuery: "upQuery",
    latencyQuery: "latencyQuery",
    errorQuery: "errorQuery",
    logsSelector: "logsSelector",
    dashboardUidField: "dashboardUid",
    traceIdRegex: "traceIdRegex (isteğe bağlı geçersiz kılma)",
    dashboardUidPlaceholder: "grafana pano UID",
    traceIdRegexPlaceholder: "varsayılanları kullanmak için boş bırakın",
  },
  status: {
    saved: "kaydedildi",
    saving: "kaydediliyor…",
    error: "hata",
    unsaved: "kaydedilmedi",
  },
  actions: {
    save: "Kaydet",
    saving: "Kaydediliyor…",
    refresh: "Yenile",
  },
  empty: {
    logsHint: "Loki akışını yüklemek için bir varlık kimliği girin.",
    dashboardHint:
      "Görüntülemek için bir pano UID ve panel kimliği girin. Grafana Image Renderer eklentisi gereklidir.",
    noSamples: "Henüz örnek yok. Doldurmak için bir Grafana entegrasyonu bağlayın.",
    noAlerts: "Son zamanlarda Grafana uyarısı yok.",
    noLogs: "Bu zaman penceresinde günlük satırı yok.",
    noGrafanaIntegration:
      "Etkin Grafana entegrasyonu yok. Önce {{- link}} üzerinden bir tane bağlayın.",
    noGrafanaIntegrationLinkText: "Entegrasyonlar",
  },
  errors: {
    loading: "Yükleniyor…",
    failedSamples: "Örnekler yüklenemedi",
    failedAlerts: "Uyarılar yüklenemedi",
    failedLogs: "Günlükler yüklenemedi",
    failedTrace: "İz yüklenemedi",
    failedLoad: "Yüklenemedi",
    saveFailed: "Kaydetme başarısız oldu",
    pickIntegration: "Önce bir Grafana entegrasyonu seçin",
  },
  trace: {
    title: "İz",
    close: "Kapat",
    openTrace: "İzi aç",
  },
  alerts: {
    unnamedAlert: "(isimsiz uyarı)",
    openInGrafana: "Grafana'da aç",
    firing: "tetiklendi",
    resolved: "çözüldü",
  },
  health: {
    errorRate: "hata {{rate}}%",
    latency: "{{ms}}ms",
    status: {
      healthy: "sağlıklı",
      degraded: "bozunmuş",
      down: "çevrimdışı",
    },
  },
  grafanaPanel: {
    altFallback: "Grafana paneli {{uid}}/{{panelId}}",
    embedTitle: "{{uid}} / panel {{panelId}}",
  },
  logs: {
    traceLabel: "iz",
  },
};
