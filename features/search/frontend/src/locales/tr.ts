import type { SearchResources } from "./en";

export const tr: SearchResources = {
  page: {
    title: "Arama",
    description:
      "Katalog varlıklarını, projeleri, görevleri, takımları, ajanları, sayfaları, konuşmaları ve DevDocs sayfalarını bulun.",
  },
  form: {
    placeholder: "Ara…",
    submit: "Ara",
    submitting: "Aranıyor…",
  },
  sections: {
    project: "Projeler",
    task: "Görevler",
    catalog: "Katalog",
    team: "Takımlar",
    page: "Sayfalar",
    chat: "Konuşmalar",
    agent: "Ajanlar",
    devdoc: "DevDocs",
  },
  kinds: {
    catalog: "katalog varlığı",
    team: "takım",
    agent: "ajan",
    devdoc: "devdoc",
    project: "proje",
    task: "görev",
    chat: "konuşma",
    page: "sayfa",
  },
  empty: {
    noResults: '"{{query}}" için sonuç bulunamadı.',
  },
  errors: {
    searchFailed: "Arama başarısız oldu",
  },
};
