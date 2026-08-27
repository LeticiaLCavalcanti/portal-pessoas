/** Dados simulados. Em producao cada bloco viria de um sistema distinto
 *  (Protheus/SAP, motor de beneficios, ponto eletronico, CMS de comunicacao). */
export const user = {
  id: 'u-19472',
  name: 'Letícia Andrade',
  firstName: 'Letícia',
  registration: '019472',
  roles: ['colaborador', 'piloto'],
  area: 'Tecnologia'
};

export const notifications = [
  { id: 'n1', journeyId: 'ponto', title: 'Ponto do dia 12 pendente de ajuste', ts: '2026-08-24T11:02:00Z', read: false },
  { id: 'n2', journeyId: 'beneficios', title: 'Reembolso de R$ 214,90 aprovado', ts: '2026-08-23T16:40:00Z', read: false },
  { id: 'n3', journeyId: 'holerite', title: 'Demonstrativo de 08/2026 disponível', ts: '2026-08-22T07:30:00Z', read: false },
  { id: 'n4', journeyId: 'ferias-legado', title: 'Período aquisitivo vence em 60 dias', ts: '2026-08-20T09:15:00Z', read: true }
];

export const homeCards = [
  { id: 'h1', journeyId: 'ponto', kind: 'destaque', title: 'Você ainda não bateu o ponto hoje', cta: 'Registrar ponto', route: '/ponto' },
  { id: 'h2', journeyId: 'beneficios', kind: 'info', title: 'Saldo do vale refeição: R$ 612,30', cta: 'Ver benefícios', route: '/beneficios' },
  { id: 'h3', journeyId: 'holerite', kind: 'info', title: 'Holerite de agosto disponível', cta: 'Ver demonstrativo', route: '/holerite' },
  { id: 'h4', journeyId: 'ferias-legado', kind: 'info', title: '18 dias de férias disponíveis', cta: 'Programar férias', route: '/ferias' }
];

/** Indice de busca por dominio. Em producao: cada squad publica seu indice
 *  (ex.: Elasticsearch por dominio) e o BFF faz fan-out com timeout curto.
 *
 *  REGRA DE HIGIENE: toda rota daqui precisa existir na jornada dona. Um
 *  resultado de busca que leva a uma tela que nao trata aquela rota e, para o
 *  colaborador, indistinguivel de um link quebrado. */
export const searchIndex = [
  { journeyId: 'ponto', title: 'Espelho de ponto', subtitle: 'Jornada de trabalho', route: '/ponto/espelho' },
  { journeyId: 'ponto', title: 'Banco de horas', subtitle: 'Jornada de trabalho', route: '/ponto/banco' },
  { journeyId: 'ponto', title: 'Justificar ausência', subtitle: 'Jornada de trabalho', route: '/ponto/justificativas' },
  { journeyId: 'beneficios', title: 'Vale refeição', subtitle: 'Benefícios', route: '/beneficios/vr' },
  { journeyId: 'beneficios', title: 'Plano de saúde', subtitle: 'Benefícios', route: '/beneficios/saude' },
  { journeyId: 'beneficios', title: 'Solicitar reembolso', subtitle: 'Benefícios', route: '/beneficios/reembolso' },
  { journeyId: 'holerite', title: 'Demonstrativo de pagamento', subtitle: 'Remuneração', route: '/holerite' },
  { journeyId: 'holerite', title: 'Informe de rendimentos', subtitle: 'Remuneração', route: '/holerite/informe' },
  { journeyId: 'ferias-legado', title: 'Programar férias', subtitle: 'Jornada de trabalho', route: '/ferias' }
];

export const flags = {
  'ponto.registro-por-geolocalizacao': true,
  'beneficios.reembolso-v2': true,
  'portal.busca-global': true
};

export const ponto = {
  hoje: [{ hora: '08:57', tipo: 'entrada' }, { hora: '12:14', tipo: 'saída' }, { hora: '13:11', tipo: 'entrada' }],
  saldoBancoHoras: '+04h32',
  jornadaPrevista: '08h00',
  espelho: [
    { dia: '25/08', entrada: '08:57', saida: '18:04', saldo: '+00h07', situacao: 'ok' },
    { dia: '22/08', entrada: '09:12', saida: '18:00', saldo: '-00h12', situacao: 'ok' },
    { dia: '21/08', entrada: '08:45', saida: '18:30', saldo: '+00h45', situacao: 'ok' },
    { dia: '20/08', entrada: '09:30', saida: '17:40', saldo: '-00h50', situacao: 'ajustar' },
    { dia: '19/08', entrada: '08:50', saida: '18:10', saldo: '+00h20', situacao: 'ok' }
  ],
  banco: [
    { mes: 'Agosto/2026', credito: '06h10', debito: '01h38', saldo: '+04h32' },
    { mes: 'Julho/2026', credito: '04h00', debito: '02h15', saldo: '+01h45' },
    { mes: 'Junho/2026', credito: '02h30', debito: '03h10', saldo: '-00h40' }
  ],
  justificativas: [
    { id: 'j1', dia: '20/08/2026', motivo: 'Consulta médica', situacao: 'pendente' },
    { id: 'j2', dia: '05/08/2026', motivo: 'Falha no transporte', situacao: 'aprovada' }
  ]
};

export const beneficios = [
  { id: 'vr', nome: 'Vale refeição', valor: 'R$ 612,30', detalhe: 'Crédito em 05/09', status: 'ativo' },
  { id: 'saude', nome: 'Plano de saúde', valor: 'Bradesco Saúde TOP', detalhe: 'Titular + 1 dependente', status: 'ativo' },
  { id: 'gym', nome: 'Parceria academias', valor: 'Gympass', detalhe: 'Plano Silver', status: 'ativo' },
  { id: 'psi', nome: 'Apoio psicológico', valor: '4 sessões/mês', detalhe: 'Sem coparticipação', status: 'ativo' }
];

export const reembolsos = [
  { id: 'RB-4821', descricao: 'Consulta odontológica', valor: 'R$ 214,90', situacao: 'aprovado', enviadoEm: '23/08/2026' },
  { id: 'RB-4790', descricao: 'Exame laboratorial', valor: 'R$ 87,40', situacao: 'em análise', enviadoEm: '18/08/2026' }
];

export const solicitacoesBeneficio = [];

/** Folha de pagamento. Em producao: SAP/Protheus atras do BFF. */
export const holerite = {
  demonstrativos: [
    {
      competencia: '2026-08',
      referencia: 'Agosto/2026',
      bruto: 'R$ 14.280,00',
      descontos: 'R$ 4.867,45',
      liquido: 'R$ 9.412,55',
      situacao: 'disponível',
      tipo: 'mensal',
      linhas: [
        { descricao: 'Salário base', tipo: 'provento', valor: 'R$ 12.400,00' },
        { descricao: 'Adicional de tempo de casa', tipo: 'provento', valor: 'R$ 880,00' },
        { descricao: 'Participação em projeto', tipo: 'provento', valor: 'R$ 1.000,00' },
        { descricao: 'INSS', tipo: 'desconto', valor: 'R$ 908,86' },
        { descricao: 'IRRF', tipo: 'desconto', valor: 'R$ 2.541,29' },
        { descricao: 'Plano de saúde', tipo: 'desconto', valor: 'R$ 417,30' },
        { descricao: 'Vale refeição (coparticipação)', tipo: 'desconto', valor: 'R$ 1.000,00' }
      ]
    },
    {
      competencia: '2026-07',
      referencia: 'Julho/2026',
      bruto: 'R$ 14.220,00',
      descontos: 'R$ 4.839,90',
      liquido: 'R$ 9.380,10',
      situacao: 'pago',
      tipo: 'mensal',
      linhas: [
        { descricao: 'Salário base', tipo: 'provento', valor: 'R$ 12.400,00' },
        { descricao: 'Adicional de tempo de casa', tipo: 'provento', valor: 'R$ 880,00' },
        { descricao: 'Horas extras', tipo: 'provento', valor: 'R$ 940,00' },
        { descricao: 'INSS', tipo: 'desconto', valor: 'R$ 908,86' },
        { descricao: 'IRRF', tipo: 'desconto', valor: 'R$ 2.513,74' },
        { descricao: 'Plano de saúde', tipo: 'desconto', valor: 'R$ 417,30' },
        { descricao: 'Vale refeição (coparticipação)', tipo: 'desconto', valor: 'R$ 1.000,00' }
      ]
    },
    {
      competencia: '2025-13',
      referencia: '13º salário / 2025',
      bruto: 'R$ 6.200,00',
      descontos: 'R$ 1.510,00',
      liquido: 'R$ 4.690,00',
      situacao: 'pago',
      tipo: 'decimo-terceiro',
      linhas: [
        { descricao: '13º salário (2ª parcela)', tipo: 'provento', valor: 'R$ 6.200,00' },
        { descricao: 'INSS', tipo: 'desconto', valor: 'R$ 486,00' },
        { descricao: 'IRRF', tipo: 'desconto', valor: 'R$ 1.024,00' }
      ]
    }
  ],
  informeRendimentos: [
    { ano: '2025', situacao: 'disponível' },
    { ano: '2024', situacao: 'disponível' },
    { ano: '2026', situacao: 'em apuração' }
  ]
};
