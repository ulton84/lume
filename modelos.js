// Lume Escolas · componentes, matrizes de referência e modelos de avaliação.
// Descritores: Matriz de Referência do SAEB (documento público do Inep). Ao criar uma avaliação
// a escola recebe uma cópia e pode corrigir ou acrescentar códigos (ex.: habilidades da BNCC).
(function () {
  var COMPONENTES = [
    ['LP', 'Língua Portuguesa'], ['MAT', 'Matemática'], ['CIE', 'Ciências'], ['HIS', 'História'], ['GEO', 'Geografia'],
    ['ING', 'Inglês'], ['ART', 'Arte'], ['EDF', 'Educação Física'], ['BIO', 'Biologia'], ['FIS', 'Física'], ['QUI', 'Química'],
    ['FIL', 'Filosofia'], ['SOC', 'Sociologia'], ['FIN', 'Educação Financeira'], ['TEC', 'Tecnologia'], ['RED', 'Redação'], ['OUT', 'Outro']
  ];

  var SAEB_LP_5 = {
    D1: 'Localizar informações explícitas em um texto.',
    D2: 'Estabelecer relações entre partes de um texto, identificando repetições ou substituições que contribuem para a continuidade de um texto.',
    D3: 'Inferir o sentido de uma palavra ou expressão.',
    D4: 'Inferir uma informação implícita em um texto.',
    D5: 'Interpretar texto com auxílio de material gráfico diverso (propagandas, quadrinhos, foto etc.).',
    D6: 'Identificar o tema de um texto.',
    D7: 'Identificar o conflito gerador do enredo e os elementos que constroem a narrativa.',
    D8: 'Estabelecer relação causa/consequência entre partes e elementos do texto.',
    D9: 'Identificar a finalidade de textos de diferentes gêneros.',
    D10: 'Identificar as marcas linguísticas que evidenciam o locutor e o interlocutor de um texto.',
    D11: 'Distinguir um fato da opinião relativa a esse fato.',
    D12: 'Estabelecer relações lógico-discursivas presentes no texto, marcadas por conjunções, advérbios etc.',
    D13: 'Identificar efeitos de ironia ou humor em textos variados.',
    D14: 'Identificar o efeito de sentido decorrente do uso da pontuação e de outras notações.',
    D15: 'Reconhecer diferentes formas de tratar uma informação na comparação de textos que tratam do mesmo tema.'
  };
  var SAEB_MAT_5 = {
    D1: 'Identificar a localização/movimentação de objeto em mapas, croquis e outras representações gráficas.',
    D2: 'Identificar propriedades comuns e diferenças entre poliedros e corpos redondos, relacionando figuras tridimensionais com suas planificações.',
    D3: 'Identificar propriedades comuns e diferenças entre figuras bidimensionais pelo número de lados e pelos tipos de ângulos.',
    D4: 'Identificar quadriláteros observando as posições relativas entre seus lados (paralelos, concorrentes, perpendiculares).',
    D5: 'Reconhecer a conservação ou modificação de medidas dos lados, do perímetro e da área em ampliação e/ou redução de figuras poligonais usando malhas quadriculadas.',
    D6: 'Estimar a medida de grandezas utilizando unidades de medida convencionais ou não.',
    D7: 'Resolver problemas utilizando unidades de medida padronizadas como km/m/cm/mm, kg/g/mg, l/ml.',
    D8: 'Estabelecer relações entre unidades de medida de tempo.',
    D9: 'Estabelecer relações entre o horário de início e término e/ou o intervalo da duração de um evento.',
    D10: 'Num problema, estabelecer trocas entre cédulas e moedas do sistema monetário brasileiro, em função de seus valores.',
    D11: 'Resolver problema envolvendo o cálculo do perímetro de figuras planas desenhadas em malhas quadriculadas.',
    D12: 'Resolver problema envolvendo o cálculo ou estimativa de áreas de figuras planas desenhadas em malhas quadriculadas.',
    D13: 'Reconhecer e utilizar características do sistema de numeração decimal, como agrupamentos e trocas na base 10 e o valor posicional.',
    D14: 'Identificar a localização de números naturais na reta numérica.',
    D15: 'Reconhecer a decomposição de números naturais nas suas diversas ordens.',
    D16: 'Reconhecer a composição e a decomposição de números naturais em sua forma polinomial.',
    D17: 'Calcular o resultado de uma adição ou subtração de números naturais.',
    D18: 'Calcular o resultado de uma multiplicação ou divisão de números naturais.',
    D19: 'Resolver problema com números naturais envolvendo diferentes significados da adição ou subtração.',
    D20: 'Resolver problema com números naturais envolvendo diferentes significados da multiplicação ou divisão.',
    D21: 'Identificar diferentes representações de um mesmo número racional.',
    D22: 'Identificar a localização de números racionais representados na forma decimal na reta numérica.',
    D23: 'Resolver problema utilizando a escrita decimal de cédulas e moedas do sistema monetário brasileiro.',
    D24: 'Identificar fração como representação que pode estar associada a diferentes significados.',
    D25: 'Resolver problema com números racionais expressos na forma decimal envolvendo diferentes significados da adição ou subtração.',
    D26: 'Resolver problema envolvendo noções de porcentagem (25%, 50%, 100%).',
    D27: 'Ler informações e dados apresentados em tabelas.',
    D28: 'Ler informações e dados apresentados em gráficos (particularmente em gráficos de colunas).'
  };
  var SAEB_LP_9 = {
    D1: 'Localizar informações explícitas em um texto.',
    D2: 'Estabelecer relações entre partes de um texto, identificando repetições ou substituições que contribuem para a continuidade de um texto.',
    D3: 'Inferir o sentido de uma palavra ou expressão.',
    D4: 'Inferir uma informação implícita em um texto.',
    D5: 'Interpretar texto com auxílio de material gráfico diverso (propagandas, quadrinhos, foto etc.).',
    D6: 'Identificar o tema de um texto.',
    D7: 'Identificar a tese de um texto.',
    D8: 'Estabelecer relação entre a tese e os argumentos oferecidos para sustentá-la.',
    D9: 'Diferenciar as partes principais das secundárias em um texto.',
    D10: 'Identificar o conflito gerador do enredo e os elementos que constroem a narrativa.',
    D11: 'Estabelecer relação causa/consequência entre partes e elementos do texto.',
    D12: 'Identificar a finalidade de textos de diferentes gêneros.',
    D13: 'Identificar as marcas linguísticas que evidenciam o locutor e o interlocutor de um texto.',
    D14: 'Distinguir um fato da opinião relativa a esse fato.',
    D15: 'Estabelecer relações lógico-discursivas presentes no texto, marcadas por conjunções, advérbios etc.',
    D16: 'Identificar efeitos de ironia ou humor em textos variados.',
    D17: 'Reconhecer o efeito de sentido decorrente do uso da pontuação e de outras notações.',
    D18: 'Reconhecer o efeito de sentido decorrente da escolha de uma determinada palavra ou expressão.',
    D19: 'Reconhecer o efeito de sentido decorrente da exploração de recursos ortográficos e/ou morfossintáticos.',
    D20: 'Reconhecer diferentes formas de tratar uma informação na comparação de textos que tratam do mesmo tema.',
    D21: 'Reconhecer posições distintas entre duas ou mais opiniões relativas ao mesmo fato ou ao mesmo tema.'
  };
  var SAEB_MAT_9 = {
    D1: 'Identificar a localização/movimentação de objeto em mapas, croquis e outras representações gráficas.',
    D2: 'Identificar propriedades comuns e diferenças entre figuras bidimensionais e tridimensionais, relacionando-as com suas planificações.',
    D3: 'Identificar propriedades de triângulos pela comparação de medidas de lados e ângulos.',
    D4: 'Identificar relação entre quadriláteros por meio de suas propriedades.',
    D5: 'Reconhecer a conservação ou modificação de medidas dos lados, do perímetro e da área em ampliação e/ou redução de figuras poligonais usando malhas quadriculadas.',
    D6: 'Reconhecer ângulos como mudança de direção ou giros, identificando ângulos retos e não retos.',
    D7: 'Reconhecer que as imagens de uma figura construída por uma transformação homotética são semelhantes.',
    D8: 'Resolver problema utilizando propriedades dos polígonos (soma dos ângulos internos, número de diagonais, ângulo interno de polígonos regulares).',
    D9: 'Interpretar informações apresentadas por meio de coordenadas cartesianas.',
    D10: 'Utilizar relações métricas do triângulo retângulo para resolver problemas.',
    D11: 'Reconhecer círculo/circunferência, seus elementos e algumas de suas relações.',
    D12: 'Resolver problema envolvendo o cálculo de perímetro de figuras planas.',
    D13: 'Resolver problema envolvendo o cálculo de área de figuras planas.',
    D14: 'Resolver problema envolvendo noções de volume.',
    D15: 'Resolver problema utilizando relações entre diferentes unidades de medida.',
    D16: 'Identificar a localização de números inteiros na reta numérica.',
    D17: 'Identificar a localização de números racionais na reta numérica.',
    D18: 'Efetuar cálculos com números inteiros envolvendo as operações.',
    D19: 'Resolver problema com números naturais envolvendo diferentes significados das operações.',
    D20: 'Resolver problema com números inteiros envolvendo as operações.',
    D21: 'Reconhecer as diferentes representações de um número racional.',
    D22: 'Identificar fração como representação que pode estar associada a diferentes significados.',
    D23: 'Identificar frações equivalentes.',
    D24: 'Reconhecer as representações decimais dos números racionais como extensão do sistema de numeração decimal (décimos, centésimos, milésimos).',
    D25: 'Efetuar cálculos que envolvam operações com números racionais.',
    D26: 'Resolver problema com números racionais envolvendo as operações.',
    D27: 'Efetuar cálculos simples com valores aproximados de radicais.',
    D28: 'Resolver problema que envolva porcentagem.',
    D29: 'Resolver problema que envolva variação proporcional, direta ou inversa, entre grandezas.',
    D30: 'Calcular o valor numérico de uma expressão algébrica.',
    D31: 'Resolver problema que envolva equação do 2º grau.',
    D32: 'Identificar a expressão algébrica que expressa uma regularidade observada em sequências de números ou figuras.',
    D33: 'Identificar uma equação ou inequação do 1º grau que expressa um problema.',
    D34: 'Identificar um sistema de equações do 1º grau que expressa um problema.',
    D35: 'Identificar a relação entre as representações algébrica e geométrica de um sistema de equações do 1º grau.',
    D36: 'Resolver problema envolvendo informações apresentadas em tabelas e/ou gráficos.',
    D37: 'Associar informações apresentadas em listas e/ou tabelas simples aos gráficos que as representam e vice-versa.'
  };

  function prefixar(comp, m) { var o = {}; Object.keys(m).forEach(function (k) { o[comp + '|' + k] = m[k]; }); return o; }
  function juntar() { var o = {}; Array.prototype.forEach.call(arguments, function (m) { Object.keys(m).forEach(function (k) { o[k] = m[k]; }); }); return o; }

  var FAIXAS_SAEB = { limites: [50, 70], nomes: ['Abaixo do básico', 'Básico', 'Adequado'] };
  var FAIXAS_ALFA = { limites: [60, 80], nomes: ['Intervenção', 'Em desenvolvimento', 'Consolidada'] };

  // Modelos: estrutura inicial; a escola ajusta número de questões, gabarito e códigos.
  var MODELOS = [
    { id: 'saeb5', nome: 'SAEB / SARESP · 5º ano', desc: 'Língua Portuguesa e Matemática com os descritores da Matriz do SAEB do 5º ano.',
      serie: 'EF-5', comps: [['LP', 22], ['MAT', 22]], faixas: FAIXAS_SAEB, descritores: juntar(prefixar('LP', SAEB_LP_5), prefixar('MAT', SAEB_MAT_5)) },
    { id: 'saeb9', nome: 'SAEB / SARESP · 9º ano', desc: 'Língua Portuguesa e Matemática com os descritores da Matriz do SAEB do 9º ano.',
      serie: 'EF-9', comps: [['LP', 26], ['MAT', 26]], faixas: FAIXAS_SAEB, descritores: juntar(prefixar('LP', SAEB_LP_9), prefixar('MAT', SAEB_MAT_9)) },
    { id: 'saebem', nome: 'SAEB · Ensino Médio', desc: 'Língua Portuguesa com os descritores da Matriz do SAEB (3ª série). Matemática com os códigos que a escola cadastrar.',
      serie: 'EM-3', comps: [['LP', 26], ['MAT', 26]], faixas: FAIXAS_SAEB, descritores: prefixar('LP', SAEB_LP_9) },
    { id: 'paulista', nome: 'Prova Paulista', desc: 'Questões ligadas às habilidades do Currículo Paulista / BNCC (ex.: EF05LP03). A escola digita os códigos.',
      serie: 'EF-5', comps: [['LP', 13], ['MAT', 13]], faixas: FAIXAS_SAEB, descritores: {} },
    { id: 'alfa', nome: 'Sarespinho / alfabetização', desc: 'Faixas de alfabetização: Intervenção (abaixo de 60%), Em desenvolvimento (60–79%) e Consolidada (80% ou mais).',
      serie: 'EF-2', comps: [['LP', 15], ['MAT', 15]], faixas: FAIXAS_ALFA, descritores: {} },
    { id: 'plataforma', tipo: 'percentual', nome: 'Importada da plataforma (% por componente)', desc: 'Para provas corrigidas pela plataforma da SEDUC (ex.: Prova Paulista): você importa o arquivo da turma com o % de acerto de cada aluno em cada componente.',
      serie: 'EF-5', comps: [], faixas: FAIXAS_SAEB, descritores: {} },
    { id: 'branco', nome: 'Em branco', desc: 'Você escolhe componentes, número de questões, gabarito, códigos e faixas.',
      serie: 'EF-5', comps: [['LP', 10]], faixas: FAIXAS_SAEB, descritores: {} }
  ];

  window.LUME_MODELOS = { COMPONENTES: COMPONENTES, MODELOS: MODELOS, FAIXAS_SAEB: FAIXAS_SAEB, FAIXAS_ALFA: FAIXAS_ALFA,
    nomeComp: function (c) { for (var i = 0; i < COMPONENTES.length; i++) if (COMPONENTES[i][0] === c) return COMPONENTES[i][1]; return c; } };
})();

// Calendário escolar: legenda oficial do calendário homologado da SEDUC-SP.
// tipo: let = dia letivo; evt = evento em dia letivo; est = estudos intensivos (letivo); sem = sem aula; plan = planejamento (sem aula); fds = fim de semana
(function () {
  var COD = {
    L: ['Dia letivo', 'let'], S: ['Sábado', 'fds'], D: ['Domingo', 'fds'],
    FE: ['Feriado', 'sem'], PTF: ['Ponto facultativo', 'sem'], F: ['Férias docentes', 'sem'], RE: ['Recesso escolar', 'sem'], DNL: ['Dia não letivo', 'sem'],
    PL: ['Planejamento', 'plan'], REP: ['Replanejamento', 'plan'], SEI: ['Semana de estudos intensivos', 'est'],
    IBI: ['Início de bimestre', 'evt'], FBI: ['Término de bimestre', 'evt'], RPM: ['Reunião da APM', 'evt'], RGE: ['Reunião do Grêmio Estudantil', 'evt'],
    RCE: ['Reunião do Conselho de Escola', 'evt'], CES: ['Eleição do Conselho de Escola', 'evt'], RPR: ['Reunião de pais/responsáveis', 'evt'],
    CCL: ['Conselho de classe', 'evt'], VLC: ['Semana Não Violência', 'evt'], DCC: ['Dia C da Convivência', 'evt'], FOR: ['Formatura', 'evt'],
    AF: ['Avaliação final', 'evt'], RDL: ['Reposição de dia letivo', 'evt']
  };
  function cods(txt) { return String(txt || '').toUpperCase().split(/[+,;\s]+/).filter(function (c) { return c && COD[c]; }); }
  // letivo: tem algum código e nenhum é de dia sem aula, planejamento ou fim de semana (regra que fecha os 201 dias do calendário 2026)
  function letivo(lista) { return lista.length > 0 && !lista.some(function (c) { var t = COD[c][1]; return t === 'sem' || t === 'plan' || t === 'fds'; }); }
  function tipo(lista) {
    if (!lista.length) return '';
    var t = lista.map(function (c) { return COD[c][1]; });
    if (t.indexOf('sem') !== -1) return 'sem'; if (t.indexOf('plan') !== -1) return 'plan'; if (t.indexOf('est') !== -1) return 'est';
    if (t.indexOf('evt') !== -1) return 'evt'; if (t.every(function (x) { return x === 'fds'; })) return 'fds'; return 'let';
  }
  // descrição escrita -> código (para planilhas que trazem o nome do evento)
  function codigoDeTexto(txt) {
    var n = String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    if (COD[n.trim()]) return n.trim();
    var achou = ''; Object.keys(COD).some(function (k) { var d = COD[k][0].normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); if (n.indexOf(d) !== -1) { achou = k; return true; } return false; });
    if (achou) return achou;
    if (/FERIADO/.test(n)) return 'FE'; if (/FERIAS/.test(n)) return 'F'; if (/RECESSO/.test(n)) return 'RE'; if (/PONTO FACULT/.test(n)) return 'PTF';
    if (/REPLANEJ/.test(n)) return 'REP'; if (/PLANEJ/.test(n)) return 'PL'; if (/CONSELHO DE CLASSE/.test(n)) return 'CCL'; if (/PAIS|RESPONSAVE/.test(n)) return 'RPR';
    if (/LETIVO/.test(n) && !/NAO/.test(n)) return 'L'; if (/NAO LETIVO/.test(n)) return 'DNL';
    return '';
  }
  window.LUME_CAL = { COD: COD, cods: cods, letivo: letivo, tipo: tipo, codigoDeTexto: codigoDeTexto };
})();
