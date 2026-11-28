export const AI_LABELS = {
  en: {
    title: "DineBook Assistant", intro: "Your dining companion", welcome: "Welcome to DineBook AI!",
    help: "Hi! I'm your DineBook assistant. I can help you explore restaurants, manage reservations, track orders, and answer your questions.",
    placeholder: "Ask about your next dining experience…", send: "Send message", stop: "Stop reply", new: "New chat", history: "Conversations", language: "Language",
    loading: "DineBook AI is thinking…", copy: "Copy chat summary", copied: "Summary copied", more: "More details", articles: "Related help",
    note: "AI can make mistakes. Check important details on their pages.",
    actions: ["Find Restaurants", "My Reservations", "Track My Order", "Payment Help", "Offers & Discounts", "Contact Support", "Wallet Balance", "Refund Status"],
  },
  ml: {
    title: "DineBook സഹായം", intro: "നിങ്ങളുടെ ഭക്ഷണാനുഭവത്തിനുള്ള സഹായം.", welcome: "DineBook AI-ലേക്ക് സ്വാഗതം!",
    help: "ബുക്കിംഗ്, ഓർഡർ, വാലറ്റ്, റെസ്റ്റോറന്റ് എന്നിവയെക്കുറിച്ച് ചോദിക്കാം.",
    placeholder: "ചോദ്യം എഴുതുക…", send: "അയയ്ക്കുക", stop: "നിർത്തുക", new: "പുതിയ ചാറ്റ്", history: "സംഭാഷണങ്ങൾ", language: "ഭാഷ",
    loading: "മറുപടി തയ്യാറാക്കുന്നു…", copy: "സഹായ സംഗ്രഹം പകർത്തുക", copied: "സംഗ്രഹം പകർത്തി", more: "കൂടുതൽ വിവരങ്ങൾ", articles: "കൂടുതൽ സഹായം",
    note: "AI സഹായം · ബുക്കിംഗും പേയ്‌മെന്റും ബന്ധപ്പെട്ട പേജുകളിൽ കൈകാര്യം ചെയ്യാം.",
    actions: ["റെസ്റ്റോറന്റുകൾ കണ്ടെത്തുക", "എന്റെ ബുക്കിംഗുകൾ", "എന്റെ ഓർഡറുകൾ", "പേയ്‌മെന്റ് ചരിത്രം", "റെസ്റ്റോറന്റ് ഓഫറുകൾ", "മനുഷ്യ സഹായം", "വാലറ്റ് ബാലൻസ്", "റീഫണ്ട് നില"],
  },
  hi: {
    title: "DineBook सहायता", intro: "आपके भोजन अनुभव में मदद।", welcome: "DineBook AI में आपका स्वागत है!",
    help: "बुकिंग, ऑर्डर, वॉलेट या रेस्तरां के बारे में पूछें।",
    placeholder: "अपना सवाल लिखें…", send: "भेजें", stop: "रोकें", new: "नई चैट", history: "बातचीत", language: "भाषा",
    loading: "जवाब तैयार हो रहा है…", copy: "सहायता सारांश कॉपी करें", copied: "सारांश कॉपी हुआ", more: "और जानकारी", articles: "संबंधित सहायता",
    note: "AI सहायता · बुकिंग और भुगतान संबंधित पेज पर प्रबंधित करें।",
    actions: ["रेस्तरां खोजें", "मेरी बुकिंग", "मेरे ऑर्डर", "भुगतान इतिहास", "रेस्तरां ऑफर", "मानव सहायता", "वॉलेट बैलेंस", "रिफंड की स्थिति"],
  },
};

export function customerAiLabels(chat) {
  const language = chat.language === "auto" ? [...chat.messages].reverse().find((row) => row.answer)?.answer.language || "en" : chat.language;
  return { language, labels: AI_LABELS[language] || AI_LABELS.en };
}
