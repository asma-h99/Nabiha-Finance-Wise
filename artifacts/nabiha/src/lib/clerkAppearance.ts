import { shadcn } from "@clerk/themes";
import type { ClerkProviderProps } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const clerkAppearance: ClerkProviderProps["appearance"] = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside",
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorPrimary: "#0F8F87",
    colorForeground: "#1F2A2C",
    colorMutedForeground: "#5C6B6E",
    colorDanger: "#EF4444",
    colorBackground: "#FFFFFF",
    colorInput: "#F8F4EC",
    colorInputForeground: "#1F2A2C",
    colorNeutral: "#E6DFD0",
    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl border border-[#E6DFD0]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none p-8",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    main: "gap-4",
    headerTitle: "text-2xl font-bold text-[#1F2A2C] text-center",
    headerSubtitle: "text-[#5C6B6E] text-center",
    socialButtonsBlockButton:
      "border border-[#E6DFD0] hover:bg-[#F8F4EC] rounded-xl h-11",
    socialButtonsBlockButtonText: "text-[#1F2A2C] font-medium",
    formFieldLabel: "text-[#1F2A2C] font-medium text-sm",
    formFieldInput:
      "border border-[#E6DFD0] bg-[#F8F4EC] rounded-xl h-11 text-[#1F2A2C]",
    formButtonPrimary:
      "bg-[#0F8F87] hover:bg-[#0B7A73] text-white font-semibold rounded-xl h-11",
    footerActionLink: "text-[#0F8F87] hover:text-[#0B7A73] font-medium",
    footerActionText: "text-[#5C6B6E]",
    dividerLine: "bg-[#E6DFD0]",
    dividerText: "text-[#5C6B6E]",
    identityPreviewEditButton: "text-[#0F8F87]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-[#1F2A2C]",
    alert: "bg-[#FFF3E0] border border-[#F97316]/20 rounded-xl",
    otpCodeFieldInput:
      "border border-[#E6DFD0] bg-[#F8F4EC] rounded-xl text-[#1F2A2C]",
    formFieldRow: "gap-2",
    logoBox: "flex justify-center mb-2",
    logoImage: "w-16 h-16",
  },
};

export const clerkLocalization = {
  locale: "ar",
  signIn: {
    start: {
      title: "أهلاً بعودتك",
      subtitle: "سجّل الدخول للوصول إلى نَبِيهَة",
      actionText: "ليس لديك حساب؟",
      actionLink: "أنشئ حساباً جديداً",
    },
  },
  signUp: {
    start: {
      title: "أنشئ حسابك",
      subtitle: "ابدأ رحلتك المالية مع نَبِيهَة",
      actionText: "لديك حساب بالفعل؟",
      actionLink: "سجّل الدخول",
    },
  },
  socialButtonsBlockButton: "متابعة عبر {{provider|titleize}}",
  formFieldLabel__emailAddress: "البريد الإلكتروني",
  formFieldLabel__password: "كلمة المرور",
  formFieldLabel__firstName: "الاسم الأول",
  formFieldLabel__lastName: "اسم العائلة",
  formButtonPrimary: "متابعة",
  dividerText: "أو",
};
