import Icon from "@/components/ui/icon";

export function PrivacyScreen({ onBack, hideBackButton }: { onBack: () => void; hideBackButton?: boolean }) {
  const sections = [
    {
      title: "1. Общие положения",
      text: "Настоящая Политика конфиденциальности регулирует порядок сбора, хранения и использования персональных данных пользователей сервиса AutoTech. Используя приложение, вы соглашаетесь с условиями данной политики.",
    },
    {
      title: "2. Какие данные мы собираем",
      text: "При регистрации и использовании сервиса мы собираем: имя пользователя, номер телефона, информацию об автомобилях (марка, модель, год выпуска, VIN), историю заявок и обращений в сервисы.",
    },
    {
      title: "3. Цель сбора данных",
      text: "Данные используются исключительно для: обеспечения работы сервиса поиска мастеров, обработки заявок на обслуживание автомобиля, отправки уведомлений по статусу заявок, улучшения качества сервиса.",
    },
    {
      title: "4. Передача данных третьим лицам",
      text: "Мы не передаём ваши персональные данные третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством Российской Федерации. Мастера автосервиса получают только данные, необходимые для выполнения вашей заявки.",
    },
    {
      title: "5. Хранение данных",
      text: "Ваши данные хранятся на защищённых серверах. Мы принимаем технические и организационные меры для защиты персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.",
    },
    {
      title: "6. Ваши права",
      text: "Вы вправе: запросить доступ к своим персональным данным, потребовать исправления неточных данных, удалить свой аккаунт и все связанные данные, отозвать согласие на обработку данных. Для этого обратитесь в поддержку через раздел «Профиль».",
    },
    {
      title: "7. Контактные данные",
      text: "По вопросам, связанным с обработкой персональных данных, обращайтесь: kafalin@rambler.ru",
    },
    {
      title: "8. Изменения политики",
      text: "Мы оставляем за собой право вносить изменения в настоящую политику. Актуальная версия всегда доступна в приложении. Продолжение использования сервиса после изменений означает согласие с новой редакцией.",
    },
  ];

  return (
    <div className="flex flex-col pb-8">
      {!hideBackButton && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"
          >
            <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white">Политика конфиденциальности</h2>
            <p className="text-xs text-muted-foreground">Редакция от 12 июня 2026 г.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {sections.map((s) => (
          <div key={s.title} className="card-neon rounded-xl p-4">
            <h3 className="text-sm font-semibold text-neon-cyan mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15">
        <Icon name="ShieldCheck" size={16} className="text-neon-cyan flex-shrink-0" />
        <p className="text-xs text-muted-foreground">Ваши данные защищены и не передаются без вашего ведома</p>
      </div>
    </div>
  );
}

export default PrivacyScreen;