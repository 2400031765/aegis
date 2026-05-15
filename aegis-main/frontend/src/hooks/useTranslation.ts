import { i18n } from '../i18n';
import { useAuthStore } from '../store/authStore';

export const useTranslation = () => {
    useAuthStore((s) => s.language);

    return {
        t: (key: string, options?: Record<string, unknown>) => String(i18n.t(key, options)),
        locale: i18n.locale,
    };
};
