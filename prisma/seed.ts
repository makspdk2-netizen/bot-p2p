import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existingCount = await prisma.faqEntry.count();

  if (existingCount > 0) {
    console.log('FAQ entries already exist, skipping seed');
    return;
  }

  const faqEntries = [
    {
      question: 'Как пополнить баланс?',
      answer: 'Перейдите в раздел "Пополнить", выберите удобный способ оплаты и отправьте средства на указанный адрес. Баланс будет зачислен автоматически после подтверждения транзакции.',
      order: 1,
    },
    {
      question: 'Как вывести средства?',
      answer: 'Перейдите в раздел "Мои реквизиты", добавьте карту или СБП, затем в разделе "Вывод на карту" выберите сумму и способ вывода.',
      order: 2,
    },
    {
      question: 'Сколько времени занимает пополнение?',
      answer: 'Пополнение происходит автоматически после подтверждения транзакции в сети блокчейн. Обычно это занимает от нескольких минут до часа в зависимости от загруженности сети.',
      order: 3,
    },
    {
      question: 'Какие комиссии?',
      answer: 'Комиссия за пополнение — 0%. Комиссия за вывод зависит от выбранного способа. Точную информацию можно узнать в разделе вывода средств.',
      order: 4,
    },
    {
      question: 'Как работает партнёрская программа?',
      answer: 'Вы получаете процент от каждой операции приглашённого пользователя. Процент зависит от вашего уровня. Ссылка для приглашения находится в разделе "Партнёрская программа".',
      order: 5,
    },
    {
      question: 'Безопасны ли мои средства?',
      answer: 'Мы используем многоуровневую систему безопасности. Все транзакции защищены, а ваши данные хранятся в зашифрованном виде.',
      order: 6,
    },
  ];

  for (const faq of faqEntries) {
    await prisma.faqEntry.create({ data: faq });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
