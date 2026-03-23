import { PrismaClient, BodyPart, QuizNodeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding quiz for STOPY...');

  // Delete existing STOPY quiz if present (idempotent)
  await prisma.quiz.deleteMany({ where: { bodyPart: 'STOPY' } });

  const quiz = await prisma.quiz.create({
    data: { title: 'Quiz podologiczny — stopy', bodyPart: BodyPart.STOPY, isActive: true },
  });

  // ── Node helpers ──
  const pos = (x: number, y: number) => ({ positionX: x, positionY: y });

  // Create all nodes
  const start = await prisma.quizNode.create({ data: { quizId: quiz.id, type: QuizNodeType.START, ...pos(50, 300), data: {} } });

  // Q6 — medical conditions (checked first — highest priority)
  const q6 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(250, 300),
      data: {
        question: 'Czy masz cukrzycę, problemy z krążeniem lub inne schorzenia?',
        options: [
          { key: 'A', label: 'Tak, mam cukrzycę' },
          { key: 'B', label: 'Tak, mam problemy z krążeniem' },
          { key: 'C', label: 'Mam inne schorzenia' },
          { key: 'D', label: 'Nie, jestem zdrowa/y' },
        ],
      },
    },
  });

  // Q1-Q4 (chained — any A → leczniczy)
  const q1 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(500, 200),
      data: {
        question: 'Kiedy ostatnio byłaś/byłeś u podologa?',
        options: [
          { key: 'A', label: 'Nigdy lub ponad 2 lata temu' },
          { key: 'B', label: 'Ponad rok temu' },
          { key: 'C', label: 'Kilka miesięcy temu' },
          { key: 'D', label: 'Byłam/byłem niedawno' },
        ],
      },
    },
  });
  const q2 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(750, 150),
      data: {
        question: 'Czy masz odciski, nagniotki lub zgrubiały naskórek?',
        options: [
          { key: 'A', label: 'Tak, spore i uciążliwe' },
          { key: 'B', label: 'Tak, ale niewielkie' },
          { key: 'C', label: 'Zgrubiały naskórek na piętach' },
          { key: 'D', label: 'Nie mam' },
        ],
      },
    },
  });
  const q3 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(1000, 150),
      data: {
        question: 'Jak wygląda stan twoich paznokci u nóg?',
        options: [
          { key: 'A', label: 'Wrastający paznokieć lub silna deformacja' },
          { key: 'B', label: 'Zgrubienie lub przebarwienie' },
          { key: 'C', label: 'Zaniedbane, ale bez bólu' },
          { key: 'D', label: 'Są w dobrym stanie' },
        ],
      },
    },
  });
  const q4 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(1250, 150),
      data: {
        question: 'Czy odczuwasz ból lub dyskomfort podczas chodzenia?',
        options: [
          { key: 'A', label: 'Tak, często' },
          { key: 'B', label: 'Czasami' },
          { key: 'C', label: 'Rzadko' },
          { key: 'D', label: 'Nie' },
        ],
      },
    },
  });
  const q5 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(1500, 200),
      data: {
        question: 'Czego przede wszystkim oczekujesz od zabiegu?',
        options: [
          { key: 'A', label: 'Ulgi od bólu i problemów zdrowotnych' },
          { key: 'B', label: 'Kompleksowej pielęgnacji' },
          { key: 'C', label: 'Poprawy wyglądu paznokci i stóp' },
          { key: 'D', label: 'Relaksu i przyjemności' },
        ],
      },
    },
  });

  // RESULT nodes
  const rCukrzycowy = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(500, 450),
      data: { title: 'Zabieg dla stóp cukrzycowych', subtitle: 'Konsultacja, wkładki ortopedyczne, pielęgnacja przy schorzeniach', description: 'Specjalistyczny zabieg dostosowany do potrzeb osób z cukrzycą lub problemami z krążeniem.', extras: 'Koniecznie poinformuj specjalistkę o przyjmowanych lekach i historii choroby.' },
    },
  });
  const rLeczniczy = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 50),
      data: { title: 'Zabieg podologiczny leczniczy', subtitle: 'Usuwanie odcisków, korekta wrastającego paznokcia', description: 'Zabieg skupiony na leczeniu konkretnych dolegliwości stóp.', extras: 'Polecamy również konsultację w sprawie wkładek ortopedycznych.' },
    },
  });
  const rKompleksowy = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 200),
      data: { title: 'Kompleksowy zabieg pielęgnacyjny', subtitle: 'Peeling, masaż, nawilżanie', description: 'Pełna regeneracja stóp łącząca oczyszczanie i nawilżanie.', extras: 'Uzupełnij o okłady parafinowe dla głębszego nawilżenia.' },
    },
  });
  const rEstetyczny = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 350),
      data: { title: 'Zabieg pielęgnacyjno-estetyczny', subtitle: 'Klasyczny pedicure, hybryda, zdobienie', description: 'Zabieg nastawiony na piękny wygląd paznokci i zadbanych stóp.', extras: 'Zapytaj o nasze wzory zdobieniowe i kolekcje kolorów sezonu.' },
    },
  });
  const rRelaks = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 500),
      data: { title: 'Pedicure spa z masażem', subtitle: 'Masaż stóp i łydek, peeling cukrowy, okłady parafinowe', description: 'Luksusowe doświadczenie dla zmęczonych stóp.', extras: 'Połącz z aromaterapią dla pełnego spa.' },
    },
  });

  // Create QuizResult records (no mainService linked — admin can link via editor later)
  for (const node of [rCukrzycowy, rLeczniczy, rKompleksowy, rEstetyczny, rRelaks]) {
    await prisma.quizResult.create({ data: { nodeId: node.id } });
  }

  // ── Edges ──
  const edge = (src: string, tgt: string, handle: string) =>
    prisma.quizEdge.create({ data: { quizId: quiz.id, sourceNodeId: src, targetNodeId: tgt, sourceHandle: handle } });

  // START → Q6
  await edge(start.id, q6.id, 'default');

  // Q6: A/B → cukrzycowy, C/D → Q1
  await edge(q6.id, rCukrzycowy.id, 'A');
  await edge(q6.id, rCukrzycowy.id, 'B');
  await edge(q6.id, q1.id, 'C');
  await edge(q6.id, q1.id, 'D');

  // Q1: A → leczniczy, B/C/D → Q2
  await edge(q1.id, rLeczniczy.id, 'A');
  await edge(q1.id, q2.id, 'B');
  await edge(q1.id, q2.id, 'C');
  await edge(q1.id, q2.id, 'D');

  // Q2: A → leczniczy, B/C/D → Q3
  await edge(q2.id, rLeczniczy.id, 'A');
  await edge(q2.id, q3.id, 'B');
  await edge(q2.id, q3.id, 'C');
  await edge(q2.id, q3.id, 'D');

  // Q3: A → leczniczy, B/C/D → Q4
  await edge(q3.id, rLeczniczy.id, 'A');
  await edge(q3.id, q4.id, 'B');
  await edge(q3.id, q4.id, 'C');
  await edge(q3.id, q4.id, 'D');

  // Q4: A → leczniczy, B/C/D → Q5
  await edge(q4.id, rLeczniczy.id, 'A');
  await edge(q4.id, q5.id, 'B');
  await edge(q4.id, q5.id, 'C');
  await edge(q4.id, q5.id, 'D');

  // Q5: A → leczniczy, B → kompleksowy, C → estetyczny, D → relaks
  await edge(q5.id, rLeczniczy.id, 'A');
  await edge(q5.id, rKompleksowy.id, 'B');
  await edge(q5.id, rEstetyczny.id, 'C');
  await edge(q5.id, rRelaks.id, 'D');

  console.log('✓ Quiz seeded successfully:', quiz.id);
  console.log('  Nodes: 12 (1 START, 6 QUESTION, 5 RESULT)');
  console.log('  Edges: 20');
  console.log('  Note: Link mainService on result nodes via the admin quiz editor.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
