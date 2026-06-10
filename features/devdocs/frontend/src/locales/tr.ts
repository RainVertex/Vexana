import type { DevdocsResources } from "./en";

export const tr: DevdocsResources = {
  freshness: {
    fresh: "Güncel",
    aging: "Eskiyor",
    stale: "Eski",
    unknown: "Tazelik bilinmiyor",
    lastEdited: "Son düzenleme: {{when}}",
    lastEditedBy: "Son düzenleme: {{when}}, {{who}} tarafından",
    verified: "· Doğrulandı {{when}}",
    markVerified: "Doğrulandı olarak işaretle",
    saving: "Kaydediliyor…",
    reportStale: "Eski olarak bildir",
  },
  time: {
    unknown: "bilinmiyor",
    today: "bugün",
    yesterday: "dün",
    daysAgo: "{{count}} gün önce",
    monthsAgo: "{{count}} ay önce",
    yearsAgo: "{{count}} yıl önce",
  },
  search: {
    placeholder: "Bu varlığın belgelerinde ara…",
    button: "Ara",
    searching: "…",
    searchAll: "Tüm DevDocs'ta ara ↗",
  },
  sidebar: {
    navLabel: "DevDocs sayfaları",
    overview: "Genel Bakış",
  },
  comments: {
    heading: "Yorumlar",
    loading: "Yorumlar yükleniyor…",
    empty: "Henüz yorum yok. Sohbeti başlatın.",
    placeholder: "Yorum ekle…",
    post: "Yorum gönder",
    posting: "Gönderiliyor…",
    delete: "Sil",
    unknownAuthor: "Bilinmiyor",
  },
  reportDialog: {
    title: "Bu sayfayı eski olarak bildir",
    description:
      "Bu, varlık sahiplerine bir inceleme bildirimi gönderir. İsteğe bağlı: neyin güncel olmadığını belirtin.",
    placeholder: "Ne güncel değil?",
    cancel: "İptal",
    submit: "Gönder",
    submitting: "Gönderiliyor…",
  },
  external: {
    heading: "Harici belgeler",
    description: "Bu varlığın belgeleri harici bir sitede bulunmaktadır.",
  },
  empty: {
    heading: "Henüz DevDocs yok",
    intro:
      "DevDocs, bu varlığın deposundan Markdown dosyalarını otomatik olarak bulur. Belgelerin burada görünmesi için aşağıdakilerden birini yapın:",
    step1:
      "Depo kökünde bir docs/ klasörü oluşturun ve içine bir veya daha fazla .md ya da .mdx dosyası ekleyin. Alt klasörler özyinelemeli olarak taranır ve iç içe sayfalara dönüştürülür (en fazla 200 dosya). Açılış sayfası olarak önce docs/index.md, yoksa docs/README.md, yoksa bulunan ilk sayfa kullanılır. Her sayfanın başlığı sırasıyla title: YAML ön maddesinden, dosyadaki ilk # başlığından veya dosya adından alınır.",
    step2:
      'Depo köküne bir README.md ekleyin. Bu dosya tek bir "Genel Bakış" sayfası olarak görüntülenir.',
    step3:
      "catalog-info.yaml dosyasındaki spec.docs alanını bu depodaki farklı bir klasöre ya da harici bir belge sitesine yönlendirin:",
    schedule:
      "Bu varlık kaydedildiğinde veya güncellendiğinde bir senkronizasyon otomatik olarak çalışır ve her iki saatte bir zamanlanmış olarak tekrarlanır.",
    lastSyncError: "Son senkronizasyon hatası: {{error}}",
    runSync: "Şimdi senkronize et",
    syncing: "Senkronize ediliyor…",
  },
  tab: {
    loadingDocs: "DevDocs yükleniyor…",
    loadingPage: "Sayfa yükleniyor…",
    resync: "Depodan yeniden senkronize et",
    resyncing: "Senkronize ediliyor…",
  },
  errors: {
    failedVerify: "Doğrulandı olarak işaretlenemedi",
    failedReport: "Rapor gönderilemedi",
    failedPostComment: "Yorum gönderilemedi",
    failedLoadDocs: "DevDocs yüklenemedi",
    failedLoadPage: "Sayfa yüklenemedi",
    failedLoadComments: "Yorumlar yüklenemedi",
    syncFailed: "Senkronizasyon başarısız oldu",
    searchFailed: "Arama başarısız oldu",
  },
};
