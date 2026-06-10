import type { TeamsResources } from "./en";

export const tr: TeamsResources = {
  page: {
    teamsTitle: "Takımlar",
    teamsDescription: "Kişiler, roller, sahiplik.",
    requestTeamTitle: "Takım talebi",
    requestTeamDescription:
      "Bir yöneticinin incelemesi için talep gönderin. Yeni takımı bağlı bir GitHub org'una yansıtabilirsiniz.",
    teamTitle: "Takım",
    teamRequestsTitle: "Takım talepleri",
    teamRequestsDescription:
      "Bekleyen takım oluşturma taleplerini onaylayın, reddedin veya değişiklik önerin.",
    teamPoliciesTitle: "Takım politikaları",
    teamPoliciesDescription:
      "Her takım talebine gönderim sırasında uygulanan katı kurallar. Yeni bir politika eklemek kod değişikliği gerektirir; bu sayfa mevcut politikaları açıp kapatır ve yapılandırır.",
    requestMaintainerTitle: "Bakımcılık talebi",
    requestMaintainerDescription:
      "Üye olduğunuz ancak henüz lider olmadığınız bir takımı seçin ve bakımcı olmak için talep gönderin.",
  },
  actions: {
    requestTeam: "Takım talep et",
    reviewRequests: "Talepleri incele",
    approve: "Onayla",
    reject: "Reddet",
    proposeChanges: "Değişiklik öner",
    requestMaintainership: "Bakımcılık talep et",
    delete: "Sil",
    leave: "Ayrıl",
    remove: "Çıkar",
    transfer: "Aktar",
    saveConfig: "Yapılandırmayı kaydet",
    cancel: "İptal",
    submit: "Gönder",
    submitting: "Gönderiliyor…",
    rejecting: "Reddediliyor…",
    sendProposal: "Öneriyi gönder",
    sendCounterProposal: "Karşı öneri gönder",
    requestToBecomeMaintianer: "Bakımcı olmak için talep et",
  },
  status: {
    loading: "Yükleniyor…",
    searching: "Aranıyor…",
    waitingOnRequester: "talep sahibi bekleniyor",
    maintainerRequestPending: "Bakımcı talebi beklemede",
  },
  empty: {
    noTeams: "Henüz takım yok.",
    queueEmpty: "Kuyruk boş.",
    noMatches: "Eşleşme yok",
    alreadyLeadOrPending:
      "Üye olduğunuz her takımda lider konumundasınız ya da bekleyen bir talebiniz var.",
  },
  errors: {
    failedToLoadTeams: "Takımlar yüklenemedi",
    failedToLoad: "Yüklenemedi",
    updateFailed: "Güncelleme başarısız",
    approveFailed: "Onaylama başarısız",
    rejectFailed: "Reddetme başarısız",
    addFailed: "Ekleme başarısız",
    removeFailed: "Çıkarma başarısız",
    transferFailed: "Aktarma başarısız",
    deleteFailed: "Silme başarısız",
    submissionFailed: "Gönderim başarısız",
    searchFailed: "Arama başarısız",
  },
  members: {
    sectionTitle: "Üyeler ({{count}})",
    addMemberTitle: "Üye ekle",
    roleLead: "lider",
    roleMember: "üye",
    alreadyAdded: "zaten eklendi",
    removeAriaLabel: "{{name}} kişisini kaldır",
  },
  transfer: {
    sectionTitle: "Sahipliği aktar",
    description:
      "Bu takıma ait tüm katalog varlıklarını ve projeleri başka bir takıma taşıyın. Takımın kaynakları varsa silmeden önce bu işlem gereklidir.",
    selectTargetPlaceholder: "— Hedef takımı seçin —",
  },
  confirm: {
    deleteTeam: '"{{name}}" geçici olarak silinsin mi? 30 gün içinde geri yüklenebilir.',
    transferResult: "{{count}} varlık {{slug}} takımına aktarıldı.",
  },
  form: {
    teamNameLabel: "Takım adı",
    teamNamePlaceholder: "Yeni takımım",
    slugLabel: "Slug",
    slugPlaceholder: "veri-platform-takimi",
    descriptionLabel: "Açıklama (isteğe bağlı)",
    descriptionLabelEdit: "Açıklama",
    maintainersLabel: "Bakımcılar (isteğe bağlı)",
    membersLabel: "Üyeler (isteğe bağlı)",
    noMembersHint: "Üye veya bakımcı seçmezseniz yalnızca siz bakımcı olarak eklenirsiniz.",
    mirrorToGithub: "GitHub'a yansıt?",
    whichGithubOrg: "Hangi GitHub org?",
    selectOrgPlaceholder: "— Bir org seçin —",
    noGithubIntegrations:
      "Bağlı etkin GitHub entegrasyonu yok. Bir yöneticiden GitHub Uygulamasını kurmasını isteyin.",
    noGithubIntegrationsShort: "Bağlı etkin GitHub entegrasyonu yok.",
    githubMembersHint:
      "Seçilen kullanıcılar GitHub takımına da eklenecek. GitHub'ın ekleyemediği kullanıcılar (org üyesi olmayan veya davet edilemeyen) atlanacak, diğerleri işlenecektir.",
    addMaintainerPlaceholder: "Bakımcı ekle…",
    addMemberPlaceholder: "Üye ekle…",
    whyOptionalLabel: "Neden? (isteğe bağlı)",
    whyPlaceholder: "Onaylayıcının karar vermesine yardımcı olacak bağlam.",
    reasonPlaceholder: "Bu talep neden reddediliyor?",
    autoCancelWarning:
      "Bu {{round}}. düzenleme olacak ve 3 turlu müzakere sınırını aşıyor. Göndermek talebi otomatik iptal edecek ve her iki tarafı bilgilendirecektir.",
  },
  policy: {
    enabledLabel: "Etkin",
    requiredSuffixLabel: "Zorunlu sonek",
    requireHyphenLabel: "Kelimeler arasında tire zorunlu",
  },
  requestList: {
    byRound: "{{name}} tarafından · {{round}}. tur / 3",
    mirrorToOrg: "GitHub org'una yansıt: {{org}}",
    mirrorMissingIntegration:
      "Yansıtma talep edildi ancak bağlı GitHub entegrasyonu eksik veya devre dışı.",
    changesFromOriginal: "Özgün talepten değişiklikler",
    diffNone: "(yok)",
  },
  diff: {
    slug: "slug",
    name: "ad",
    description: "açıklama",
    mirrorToGithub: "GitHub'a yansıt",
    githubIntegration: "GitHub entegrasyonu",
    yes: "evet",
    no: "hayır",
  },
  proposedMembers: {
    maintainersLabel: "Bakımcılar",
    membersLabel: "Üyeler",
  },
  dialogs: {
    rejectTeamRequestTitle: "Takım talebini reddet",
    rejectTeamRequestTitleWithName: "Takım talebini reddet: {{name}}",
    rejectNotification: "Talep sahibi belirttiğiniz gerekçeyle bilgilendirilecektir.",
    rejectMaintainerRequestTitle: "Bakımcı talebini reddet",
    rejectMaintainerRequestTitleWithInfo:
      "Bakımcı talebini reddet: {{requester}}, {{team}} takımı için",
    requestTeamTitle: "Takım talep et",
    requestTeamDescription:
      "Bir yöneticinin incelemesi için talep gönderin. Takımı bağlı bir GitHub org'una da yansıtabilirsiniz.",
    proposeChangesTitle: "Değişiklik öner",
    proposeChangesDescription:
      "Herhangi bir alanı düzenleyip talep sahibine onay için geri gönderin. Talep sahibi onaylayabilir, karşı öneri sunabilir veya iptal edebilir.",
    counterProposeTitle: "Karşı öneri",
    counterProposeDescription:
      "Yöneticinin önerisini düzenleyip geri gönderin. Yönetici değişikliklerinizi görecek ve onaylayabilir, başka değişiklikler önerebilir ya da reddedebilir.",
    requestMaintainerTitle: "Bakımcı olmak için talep et",
    requestMaintainerDescription:
      "Bir yöneticinin veya {{teamName}} takımının mevcut bakımcılarından birinin incelemesi için talep gönderin. Talep onaylandığında veya reddedildiğinde bildirim alacaksınız.",
  },
  filter: {
    showAllOrgs: "Tüm organizasyonlardaki takımları göster",
  },
  teamMeta: {
    member_one: "{{count}} üye",
    member_other: "{{count}} üye",
    lead_one: "Lider",
    lead_other: "Liderler",
    noLead: "lider yok",
  },
  userPicker: {
    defaultPlaceholder: "Ad veya e-posta ile arayın…",
  },
};
