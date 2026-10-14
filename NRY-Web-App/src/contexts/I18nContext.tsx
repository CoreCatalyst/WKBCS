"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SUPPORTED_LANGUAGES, LanguageInfo } from "@/lib/countryLanguageData";

// Core translation dictionaries for essential marketplace actions and keys
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.explore": "Explore Products & Services",
    "nav.businesses": "Businesses",
    "nav.how_it_works": "How It Works",
    "nav.for_business": "For Business",
    "nav.login": "Business Login",
    "nav.register": "Register Business",
    "nav.dashboard": "Business Hub",
    "nav.admin": "Admin",
    "nav.account": "Account",
    "nav.contact": "Contact",
    "btn.explore": "Explore Products & Services",
    "btn.register_business": "Register Your Business",
    "btn.search": "Search",
    "btn.buy_now": "Buy Now",
    "btn.contact_business": "Contact Business",
    "btn.send_enquiry": "Send Enquiry",
    "btn.add_product": "Add Product / Service",
    "checkout.title": "Choose Payment Method",
    "checkout.secured_escrow": "Secured Escrow Protection",
    "checkout.total_payable": "Total Payable Amount",
    "checkout.place_order": "Place Order",
    "checkout.continue_payment": "Continue to Payment",
    "footer.tagline": "Connect • Discover • Grow"
  },
  hi: {
    "nav.home": "मुख्य पृष्ठ",
    "nav.explore": "उत्पाद और सेवाएं देखें",
    "nav.businesses": "व्यापार निर्देशिका",
    "nav.how_it_works": "यह कैसे काम करता है",
    "nav.for_business": "व्यापार के लिए",
    "nav.login": "बिजनेस लॉगिन",
    "nav.register": "व्यापार रजिस्टर करें",
    "nav.dashboard": "बिजनेस हब",
    "nav.admin": "एडमिन",
    "nav.account": "खाता",
    "nav.contact": "संपर्क",
    "btn.explore": "उत्पाद और सेवाएं देखें",
    "btn.register_business": "अपना व्यापार रजिस्टर करें",
    "btn.search": "खोजें",
    "btn.buy_now": "अभी खरीदें",
    "btn.contact_business": "व्यापारी से संपर्क करें",
    "btn.send_enquiry": "पूछताछ भेजें",
    "btn.add_product": "उत्पाद / सेवा जोड़ें",
    "checkout.title": "भुगतान विधि चुनें",
    "checkout.secured_escrow": "सुरक्षित एस्क्रो संरक्षण",
    "checkout.total_payable": "कुल देय राशि",
    "checkout.place_order": "ऑर्डर करें",
    "checkout.continue_payment": "भुगतान के लिए आगे बढ़ें",
    "footer.tagline": "जुड़ें • खोजें • बढ़ें"
  },
  mr: {
    "nav.home": "मुख्यपृष्ठ",
    "nav.explore": "उत्पादने आणि सेवा शोधा",
    "nav.businesses": "व्यवसाय",
    "nav.how_it_works": "हे कसे कार्य करते",
    "nav.for_business": "व्यवसायासाठी",
    "nav.login": "व्यवसाय लॉगिन",
    "nav.register": "व्यवसाय नोंदणी करा",
    "nav.dashboard": "व्यवसाय हब",
    "nav.admin": "प्रशासक",
    "nav.contact": "संपर्क",
    "btn.explore": "उत्पादने आणि सेवा शोधा",
    "btn.register_business": "आपला व्यवसाय नोंदवा",
    "btn.search": "शोधा",
    "btn.buy_now": "आता खरेदी करा",
    "btn.contact_business": "व्यवसायाशी संपर्क साधा",
    "btn.send_enquiry": "चौकशी पाठवा",
    "checkout.title": "पेमेंट पद्धत निवडा",
    "checkout.total_payable": "एकूण देय रक्कम",
    "checkout.place_order": "ऑर्डर द्या",
    "footer.tagline": "जोडा • शोधा • वाढवा"
  },
  bn: {
    "nav.home": "হোম",
    "nav.explore": "পণ্য ও পরিষেবা অন্বেষণ করুন",
    "nav.businesses": "ব্যবসা",
    "nav.how_it_works": "এটি কীভাবে কাজ করে",
    "nav.for_business": "ব্যবসার জন্য",
    "nav.login": "ব্যবসা লগইন",
    "nav.register": "ব্যবসা নিবন্ধন করুন",
    "nav.dashboard": "বিজনেস হাব",
    "nav.admin": "অ্যাডমিন",
    "btn.explore": "পণ্য ও পরিষেবা দেখুন",
    "btn.register_business": "আপনার ব্যবসা নিবন্ধন করুন",
    "btn.search": "অনুসন্ধান",
    "btn.buy_now": "এখনই কিনুন",
    "btn.contact_business": "ব্যবসায়ীর সাথে যোগাযোগ করুন",
    "btn.send_enquiry": "অনুসন্ধান পাঠান",
    "checkout.title": "পেমেন্ট পদ্ধতি নির্বাচন করুন",
    "checkout.total_payable": "মোট প্রদেয় অর্থ",
    "checkout.place_order": "অর্ডার সম্পন্ন করুন",
    "footer.tagline": "যুক্ত হন • সন্ধান করুন • সমৃদ্ধ হন"
  },
  ta: {
    "nav.home": "முகப்பு",
    "nav.explore": "பொருட்கள் & சேவைகளை ஆராயுங்கள்",
    "nav.businesses": "வணிகங்கள்",
    "nav.how_it_works": "இது எவ்வாறு இயங்குகிறது",
    "nav.for_business": "வணிகத்திற்கு",
    "nav.login": "வணிக உள்நுழைவு",
    "nav.register": "வணிகத்தை பதிவுசெய்க",
    "nav.dashboard": "வணிக மையம்",
    "nav.admin": "நிர்வாகி",
    "btn.explore": "பொருட்கள் & சேவைகளை ஆராயுங்கள்",
    "btn.register_business": "உங்கள் வணிகத்தை பதிவுசெய்க",
    "btn.search": "தேடு",
    "btn.buy_now": "இப்போது வாங்குங்கள்",
    "btn.contact_business": "வணிகத்தைத் தொடர்பு கொள்ளுங்கள்",
    "btn.send_enquiry": "விசாரணை அனுப்பவும்",
    "checkout.title": "பணம் செலுத்தும் முறையைத் தேர்ந்தெடுக்கவும்",
    "checkout.total_payable": "செலுத்த வேண்டிய மொத்த தொகை",
    "checkout.place_order": "ஆர்டரை உறுதிசெய்க",
    "footer.tagline": "இணைக்கவும் • கண்டறியவும் • வளரவும்"
  },
  te: {
    "nav.home": "హోమ్",
    "nav.explore": "ఉత్పత్తులు & సేవలను అన్వేషించండి",
    "nav.businesses": "వ్యాపారాలు",
    "nav.how_it_works": "ఇది ఎలా పనిచేస్తుంది",
    "nav.for_business": "వ్యాపారం కోసం",
    "nav.login": "బిజినెస్ లాగిన్",
    "nav.register": "వ్యాపారాన్ని నమోదు చేయండి",
    "nav.dashboard": "బిజినెస్ హబ్",
    "nav.admin": "అడ్మిన్",
    "btn.explore": "ఉత్పత్తులు & సేవలను అన్వేషించండి",
    "btn.register_business": "మీ వ్యాపారాన్ని నమోదు చేయండి",
    "btn.search": "శోధించండి",
    "btn.buy_now": "ఇప్పుడే కొనండి",
    "btn.contact_business": "వ్యాపారాన్ని సంప్రదించండి",
    "btn.send_enquiry": "విచారణ పంపండి",
    "checkout.title": "చెల్లింపు పద్ధతిని ఎంచుకోండి",
    "checkout.total_payable": "మొత్తం చెల్లించవలసిన మొత్తం",
    "checkout.place_order": "ఆర్డర్ ఉంచండి",
    "footer.tagline": "కనెక్ట్ చేయండి • కనుగొనండి • ఎదగండి"
  },
  gu: {
    "nav.home": "હોમ",
    "nav.explore": "ઉત્પાદનો અને સેવાઓ શોધો",
    "nav.businesses": "વેપારો",
    "nav.how_it_works": "આ કેવી રીતે કાર્ય કરે છે",
    "nav.for_business": "વેપાર માટે",
    "nav.login": "બિઝનેસ લૉગિન",
    "nav.register": "વેપાર નોંધણી કરો",
    "nav.dashboard": "બિઝનેસ હબ",
    "nav.admin": "એડમિન",
    "btn.explore": "ઉત્પાદનો અને સેવાઓ શોધો",
    "btn.register_business": "તમારો વેપાર નોંધો",
    "btn.search": "શોધો",
    "btn.buy_now": "હવે ખરીદો",
    "btn.contact_business": "વેપારી સાથે સંપર્ક કરો",
    "btn.send_enquiry": "પૂછપરછ મોકલો",
    "checkout.title": "ચુકવણી પદ્ધતિ પસંદ કરો",
    "checkout.total_payable": "કુલ ચૂકવવાપાત્ર રકમ",
    "checkout.place_order": "ઓર્ડર કરો",
    "footer.tagline": "જોડાઓ • શોધો • વધો"
  },
  kn: {
    "nav.home": "ಮುಖಪುಟ",
    "nav.explore": "ಉತ್ಪನ್ನಗಳು ಮತ್ತು ಸೇವೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    "nav.businesses": "ವ್ಯವಹಾರಗಳು",
    "nav.how_it_works": "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    "nav.for_business": "ವ್ಯವಹಾರಕ್ಕಾಗಿ",
    "nav.login": "ವ್ಯವಹಾರ ಲಾಗಿನ್",
    "nav.register": "ವ್ಯವಹಾರವನ್ನು ನೋಂದಾಯಿಸಿ",
    "nav.dashboard": "ಬಿಸಿನೆಸ್ ಹಬ್",
    "nav.admin": "ಅಡ್ಮಿನ್",
    "btn.explore": "ಉತ್ಪನ್ನಗಳು ಮತ್ತು ಸೇವೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    "btn.register_business": "ನಿಮ್ಮ ವ್ಯವಹಾರವನ್ನು ನೋಂದಾಯಿಸಿ",
    "btn.search": "ಹುಡುಕಿ",
    "btn.buy_now": "ಈಗ ಖರೀದಿಸಿ",
    "btn.contact_business": "ವ್ಯವಹಾರವನ್ನು ಸಂಪರ್ಕಿಸಿ",
    "btn.send_enquiry": "ವಿಚಾರಣೆ ಕಳುಹಿಸಿ",
    "checkout.title": "ಪಾವತಿ ವಿಧಾನವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    "checkout.total_payable": "ಒಟ್ಟು ಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ",
    "checkout.place_order": "ಆರ್ಡರ್ ಇರಿಸಿ",
    "footer.tagline": "ಸಂಪರ್ಕಿಸಿ • ಅನ್ವೇಷಿಸಿ • ಬೆಳೆಯಿರಿ"
  },
  ml: {
    "nav.home": "ഹോം",
    "nav.explore": "ഉൽപ്പന്നങ്ങളും സേവനങ്ങളും കണ്ടെത്തുക",
    "nav.businesses": "വ്യാപാരങ്ങൾ",
    "nav.how_it_works": "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു",
    "nav.for_business": "ബിസിനസ്സിന്",
    "nav.login": "ബിസിനസ്സ് ലോഗിൻ",
    "nav.register": "ബിസിനസ്സ് രജിസ്റ്റർ ചെയ്യുക",
    "nav.dashboard": "ബിസിനസ്സ് ഹബ്",
    "nav.admin": "അഡ്മിൻ",
    "btn.explore": "ഉൽപ്പന്നങ്ങളും സേവനങ്ങളും കാണുക",
    "btn.register_business": "നിങ്ങളുടെ ബിസിനസ്സ് രജിസ്റ്റർ ചെയ്യുക",
    "btn.search": "തിരയുക",
    "btn.buy_now": "ഇപ്പോൾ വാങ്ങുക",
    "btn.contact_business": "വ്യാപാരിയെ ബന്ധപ്പെടുക",
    "btn.send_enquiry": "അന്വേഷണം അയയ്ക്കുക",
    "checkout.title": "പേയ്‌മെന്റ് രീതി തിരഞ്ഞെടുക്കുക",
    "checkout.total_payable": "ആകെ അടയ്‌ക്കേണ്ട തുക",
    "checkout.place_order": "ഓർഡർ നൽകുക",
    "footer.tagline": "ബന്ധപ്പെടുക • കണ്ടെത്തുക • വളരുക"
  },
  pa: {
    "nav.home": "ਮੁੱਖ ਸਫ਼ਾ",
    "nav.explore": "ਉਤਪਾਦ ਅਤੇ ਸੇਵਾਵਾਂ ਖੋਜੋ",
    "nav.businesses": "ਕਾਰੋਬਾਰ",
    "nav.how_it_works": "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ",
    "nav.for_business": "ਕਾਰੋਬਾਰ ਲਈ",
    "nav.login": "ਕਾਰੋਬਾਰੀ ਲੌਗਇਨ",
    "nav.register": "ਕਾਰੋਬਾਰ ਰਜਿਸਟਰ ਕਰੋ",
    "nav.dashboard": "ਬਿਜ਼ਨਸ ਹੱਬ",
    "nav.admin": "ਐਡਮਿਨ",
    "btn.explore": "ਉਤਪਾਦ ਅਤੇ ਸੇਵਾਵਾਂ ਦੇਖੋ",
    "btn.register_business": "ਆਪਣਾ ਕਾਰੋਬਾਰ ਰਜਿਸਟਰ ਕਰੋ",
    "btn.search": "ਖੋਜੋ",
    "btn.buy_now": "ਹੁਣੇ ਖਰੀਦੋ",
    "btn.contact_business": "ਕਾਰੋਬਾਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ",
    "btn.send_enquiry": "ਪੁੱਛਗਿੱਛ ਭੇਜੋ",
    "checkout.title": "ਭੁਗਤਾਨ ਵਿਧੀ ਚੁਣੋ",
    "checkout.total_payable": "ਕੁੱਲ ਭੁਗਤਾਨਯੋਗ ਰਕਮ",
    "checkout.place_order": "ਆਰਡਰ ਕਰੋ",
    "footer.tagline": "ਜੁੜੋ • ਖੋਜੋ • ਤਰੱਕੀ ਕਰੋ"
  },
  ur: {
    "nav.home": "صفحہ اول",
    "nav.explore": "مصنوعات اور خدمات دریافت کریں",
    "nav.businesses": "کاروبار",
    "nav.how_it_works": "یہ کیسے کام کرتا ہے",
    "nav.for_business": "کاروبار کے لیے",
    "nav.login": "کاروباری لاگ ان",
    "nav.register": "کاروبار رجسٹر کریں",
    "nav.dashboard": "بزنس ہب",
    "nav.admin": "ایڈمن",
    "nav.account": "اکاؤنٹ",
    "btn.explore": "مصنوعات اور خدمات دریافت کریں",
    "btn.register_business": "اپنا کاروبار رجسٹر کریں",
    "btn.search": "تلاش کریں",
    "btn.buy_now": "ابھی خریدیں",
    "btn.contact_business": "کاروبار سے رابطہ کریں",
    "btn.send_enquiry": "استفسار بھیجیں",
    "btn.add_product": "مصنوعات / سروس شامل کریں",
    "checkout.title": "ادائیگی کا طریقہ منتخب کریں",
    "checkout.secured_escrow": "محفوظ ایسکرو تحفظ",
    "checkout.total_payable": "کل قابل ادائیگی رقم",
    "checkout.place_order": "آرڈر دیں",
    "checkout.continue_payment": "ادائیگی کے لیے آگے بڑھیں",
    "footer.tagline": "جڑیں • دریافت کریں • ترقی کریں"
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.explore": "استكشف المنتجات والخدمات",
    "nav.businesses": "الشركات",
    "nav.how_it_works": "كيف يعمل",
    "nav.for_business": "للأعمال",
    "nav.login": "تسجيل دخول الأعمال",
    "nav.register": "تسجيل عمل جديد",
    "nav.dashboard": "مركز الأعمال",
    "nav.admin": "المشرف",
    "nav.account": "الحساب",
    "btn.explore": "استكشف المنتجات والخدمات",
    "btn.register_business": "سجل عملك التجاري",
    "btn.search": "بحث",
    "btn.buy_now": "اشتري الآن",
    "btn.contact_business": "تواصل مع الشركة",
    "btn.send_enquiry": "إرسال استفسار",
    "btn.add_product": "إضافة منتج / خدمة",
    "checkout.title": "اختر طريقة الدفع",
    "checkout.secured_escrow": "حماية الضمان المشفر",
    "checkout.total_payable": "المبلغ الإجمالي المستحق",
    "checkout.place_order": "إتمام الطلب",
    "checkout.continue_payment": "المتابعة إلى الدفع",
    "footer.tagline": "تواصل • اكتشف • انمو"
  },
  de: {
    "nav.home": "Startseite",
    "nav.explore": "Produkte & Dienstleistungen entdecken",
    "nav.businesses": "Unternehmen",
    "nav.how_it_works": "Wie es funktioniert",
    "nav.for_business": "Für Unternehmen",
    "nav.login": "Business-Login",
    "nav.register": "Unternehmen registrieren",
    "nav.dashboard": "Business Hub",
    "nav.admin": "Admin",
    "nav.account": "Konto",
    "btn.explore": "Produkte & Dienstleistungen entdecken",
    "btn.register_business": "Registrieren Sie Ihr Unternehmen",
    "btn.search": "Suchen",
    "btn.buy_now": "Jetzt kaufen",
    "btn.contact_business": "Unternehmen kontaktieren",
    "btn.send_enquiry": "Anfrage senden",
    "btn.add_product": "Produkt / Dienstleistung hinzufügen",
    "checkout.title": "Zahlungsmethode wählen",
    "checkout.secured_escrow": "Gesicherter Treuhandschutz",
    "checkout.total_payable": "Gesamtbetrag",
    "checkout.place_order": "Bestellung aufgeben",
    "checkout.continue_payment": "Weiter zur Zahlung",
    "footer.tagline": "Verbinden • Entdecken • Wachsen"
  },
  ja: {
    "nav.home": "ホーム",
    "nav.explore": "商品・サービスを探す",
    "nav.businesses": "事業者一覧",
    "nav.how_it_works": "ご利用案内",
    "nav.for_business": "法人向け",
    "nav.login": "ビジネスログイン",
    "nav.register": "企業登録",
    "nav.dashboard": "ビジネスハブ",
    "nav.admin": "管理者",
    "nav.account": "アカウント",
    "btn.explore": "商品・サービスを探す",
    "btn.register_business": "ビジネスを登録する",
    "btn.search": "検索",
    "btn.buy_now": "今すぐ購入",
    "btn.contact_business": "事業者に問い合わせる",
    "btn.send_enquiry": "問い合わせを送信",
    "btn.add_product": "商品/サービスを出品",
    "checkout.title": "お支払い方法の選択",
    "checkout.secured_escrow": "安心エスクロー決済保護",
    "checkout.total_payable": "合計お支払い金額",
    "checkout.place_order": "注文を確定する",
    "checkout.continue_payment": "決済へ進む",
    "footer.tagline": "繋がる • 見つける • 成長する"
  },
  fr: {
    "nav.home": "Accueil",
    "nav.explore": "Explorer les produits et services",
    "nav.businesses": "Entreprises",
    "nav.how_it_works": "Comment ça marche",
    "nav.for_business": "Pour les entreprises",
    "nav.login": "Connexion entreprise",
    "nav.register": "Inscrire une entreprise",
    "nav.dashboard": "Espace entreprise",
    "nav.admin": "Administration",
    "nav.account": "Compte",
    "btn.explore": "Explorer les produits et services",
    "btn.register_business": "Inscrire votre entreprise",
    "btn.search": "Rechercher",
    "btn.buy_now": "Acheter maintenant",
    "btn.contact_business": "Contacter l'entreprise",
    "btn.send_enquiry": "Envoyer une demande",
    "btn.add_product": "Ajouter un produit / service",
    "checkout.title": "Choisir le mode de paiement",
    "checkout.secured_escrow": "Protection séquestre sécurisée",
    "checkout.total_payable": "Montant total à payer",
    "checkout.place_order": "Passer commande",
    "checkout.continue_payment": "Procéder au paiement",
    "footer.tagline": "Connecter • Découvrir • Grandir"
  },
  es: {
    "nav.home": "Inicio",
    "nav.explore": "Explorar productos y servicios",
    "nav.businesses": "Empresas",
    "nav.how_it_works": "Cómo funciona",
    "nav.for_business": "Para empresas",
    "nav.login": "Acceso empresarial",
    "nav.register": "Registrar empresa",
    "nav.dashboard": "Centro empresarial",
    "nav.admin": "Administrador",
    "nav.account": "Cuenta",
    "btn.explore": "Explorar productos y servicios",
    "btn.register_business": "Registre su empresa",
    "btn.search": "Buscar",
    "btn.buy_now": "Comprar ahora",
    "btn.contact_business": "Contactar empresa",
    "btn.send_enquiry": "Enviar consulta",
    "btn.add_product": "Añadir producto / servicio",
    "checkout.title": "Seleccionar método de pago",
    "checkout.secured_escrow": "Protección de depósito seguro",
    "checkout.total_payable": "Monto total a pagar",
    "checkout.place_order": "Realizar pedido",
    "checkout.continue_payment": "Continuar al pago",
    "footer.tagline": "Conectar • Descubrir • Crecer"
  },
  zh: {
    "nav.home": "首页",
    "nav.explore": "浏览产品与服务",
    "nav.businesses": "企业名录",
    "nav.how_it_works": "运作流程",
    "nav.for_business": "企业服务",
    "nav.login": "企业登录",
    "nav.register": "注册企业",
    "nav.dashboard": "企业工作台",
    "nav.admin": "管理后台",
    "nav.account": "我的账户",
    "btn.explore": "浏览产品与服务",
    "btn.register_business": "注册您的企业",
    "btn.search": "搜索",
    "btn.buy_now": "立即购买",
    "btn.contact_business": "联系商家",
    "btn.send_enquiry": "发送询盘",
    "btn.add_product": "发布产品 / 服务",
    "checkout.title": "选择支付方式",
    "checkout.secured_escrow": "安全资金托管保障",
    "checkout.total_payable": "应付总额",
    "checkout.place_order": "提交订单",
    "checkout.continue_payment": "前往支付",
    "footer.tagline": "连接 • 探索 • 腾飞"
  },
  ms: {
    "nav.home": "Laman Utama",
    "nav.explore": "Terokai Produk & Perkhidmatan",
    "nav.businesses": "Perniagaan",
    "nav.how_it_works": "Cara Ia Berfungsi",
    "nav.for_business": "Untuk Perniagaan",
    "nav.login": "Log Masuk Perniagaan",
    "nav.register": "Daftar Perniagaan",
    "nav.dashboard": "Hab Perniagaan",
    "nav.admin": "Pentadbir",
    "nav.account": "Akaun",
    "btn.explore": "Terokai Produk & Perkhidmatan",
    "btn.register_business": "Daftarkan Perniagaan Anda",
    "btn.search": "Cari",
    "btn.buy_now": "Beli Sekarang",
    "btn.contact_business": "Hubungi Peniaga",
    "btn.send_enquiry": "Hantar Pertanyaan",
    "btn.add_product": "Tambah Produk / Perkhidmatan",
    "checkout.title": "Pilih Kaedah Pembayaran",
    "checkout.secured_escrow": "Perlindungan Escrow Selamat",
    "checkout.total_payable": "Jumlah Perlu Dibayar",
    "checkout.place_order": "Buat Pesanan",
    "checkout.continue_payment": "Teruskan ke Pembayaran",
    "footer.tagline": "Hubung • Teroka • Berkembang"
  }
};

interface I18nContextType {
  locale: string;
  setLocale: (loc: string) => void;
  currentLanguage: LanguageInfo;
  t: (keyPath: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<string>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("noryvanta_locale");
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setLocaleState(saved);
      }
    }
  }, []);

  const setLocale = (newLoc: string) => {
    setLocaleState(newLoc);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_locale", newLoc);
    }
  };

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0];

  const t = (keyPath: string): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS["en"];
    if (dict && keyPath in dict) {
      return dict[keyPath];
    }
    // Fallback to English
    if (TRANSLATIONS["en"] && keyPath in TRANSLATIONS["en"]) {
      return TRANSLATIONS["en"][keyPath];
    }
    return keyPath;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, currentLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
