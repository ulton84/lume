// Lume Escolas · cálculos das avaliações (funções puras, sem tela e sem banco).
// marcadas: texto com uma letra por questão, na ordem de av.questoes ("A".."E"; "-" = em branco).
// Questão com gabarito "*" está anulada e não entra no cálculo.
(function (raiz) {
  var LETRAS = 'ABCDE';

  function validas(av) { return av.questoes.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return LETRAS.indexOf(x.q.gab) !== -1; }); }
  function fez(m) { return /[A-E]/.test(m || ''); }
  function faixaDe(av, p) { var l = (av.faixas && av.faixas.limites) || [50, 70]; var v = p * 100; return v < l[0] ? 0 : v < l[1] ? 1 : 2; }
  function media(l) { var v = l.filter(function (x) { return x != null; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; }
  function componentes(av) { var c = []; av.questoes.forEach(function (q) { if (c.indexOf(q.comp) === -1) c.push(q.comp); }); return c; }
  function chave(q) { return q.cod ? q.comp + '|' + q.cod : ''; }

  // Acerto de uma folha de respostas: geral e por componente
  function corrigir(av, marcadas) {
    var V = validas(av), porComp = {}, ac = 0, erradas = [], branco = 0;
    V.forEach(function (x) {
      var m = (marcadas || '').charAt(x.i) || '-', certo = m === x.q.gab;
      if (m === '-' || m === ' ') branco++;
      if (certo) ac++; else if (x.q.cod) erradas.push(chave(x.q));
      var c = porComp[x.q.comp] || (porComp[x.q.comp] = { ac: 0, n: 0 });
      c.n++; if (certo) c.ac++;
    });
    var pc = {}; Object.keys(porComp).forEach(function (k) { pc[k] = porComp[k].n ? porComp[k].ac / porComp[k].n : null; });
    return { acertos: ac, total: V.length, pct: V.length ? ac / V.length : null, porComp: pc, erradas: erradas, emBranco: branco };
  }

  /**
   * av: avaliação; alunos: alunos da turma [{id, nome, numero, ativo}];
   * respostasTurma: {aluno_id: marcadas}; respostasSerie: [marcadas] de todas as turmas da mesma série (para comparar).
   */
  function resultadoTurma(av, alunos, respostasTurma, respostasSerie) {
    var comps = componentes(av), V = validas(av);
    var ativos = alunos.filter(function (a) { return a.ativo !== false; });
    var porAluno = [], faltaram = [];
    ativos.forEach(function (a) {
      var m = respostasTurma[a.id];
      if (!fez(m)) { faltaram.push(a); return; }
      var r = corrigir(av, m); r.aluno = a; r.marcadas = m; r.faixa = r.pct == null ? null : faixaDe(av, r.pct);
      r.faixaComp = {}; comps.forEach(function (c) { if (r.porComp[c] != null) r.faixaComp[c] = faixaDe(av, r.porComp[c]); });
      porAluno.push(r);
    });
    var n = porAluno.length;

    // turma e série
    var turma = { avaliados: n, previstos: ativos.length, media: media(porAluno.map(function (r) { return r.pct; })), porComp: {}, faixas: [0, 0, 0], faixasComp: {} };
    comps.forEach(function (c) {
      turma.porComp[c] = media(porAluno.map(function (r) { return r.porComp[c]; }));
      var f = [0, 0, 0]; porAluno.forEach(function (r) { if (r.faixaComp[c] != null) f[r.faixaComp[c]]++; }); turma.faixasComp[c] = f;
    });
    porAluno.forEach(function (r) { if (r.faixa != null) turma.faixas[r.faixa]++; });
    var corrSerie = (respostasSerie || []).filter(fez).map(function (m) { return corrigir(av, m); });
    var serie = { avaliados: corrSerie.length, media: media(corrSerie.map(function (r) { return r.pct; })), porComp: {} };
    comps.forEach(function (c) { serie.porComp[c] = media(corrSerie.map(function (r) { return r.porComp[c]; })); });

    // por questão: acerto e alternativa mais marcada
    var porQuestao = V.map(function (x) {
      var dist = { A: 0, B: 0, C: 0, D: 0, E: 0, '-': 0 }, ac = 0;
      porAluno.forEach(function (r) { var m = r.marcadas.charAt(x.i) || '-'; if (dist[m] == null) m = '-'; dist[m]++; if (m === x.q.gab) ac++; });
      var errada = null; 'ABCDE'.split('').forEach(function (l) { if (l !== x.q.gab && dist[l] && (!errada || dist[l] > dist[errada])) errada = l; });
      return { n: x.q.n, comp: x.q.comp, cod: x.q.cod || '', gab: x.q.gab, pct: n ? ac / n : null, dist: dist, distrator: errada };
    });

    // por descritor / habilidade
    var mapa = {};
    porQuestao.forEach(function (q) {
      if (!q.cod) return;
      var k = q.comp + '|' + q.cod, d = mapa[k] || (mapa[k] = { chave: k, comp: q.comp, cod: q.cod, desc: (av.descritores || {})[k] || '', questoes: [], soma: 0, cont: 0 });
      d.questoes.push(q.n); if (q.pct != null) { d.soma += q.pct; d.cont++; }
    });
    var porCodigo = Object.keys(mapa).map(function (k) { var d = mapa[k]; d.pct = d.cont ? d.soma / d.cont : null; d.faixa = d.pct == null ? null : faixaDe(av, d.pct); delete d.soma; delete d.cont; return d; })
      .sort(function (a, b) { return (a.pct == null) - (b.pct == null) || a.pct - b.pct; });

    // grupos para encaminhamento, por componente
    var grupos = {};
    comps.forEach(function (c) {
      function grupo(f) {
        var al = porAluno.filter(function (r) { return r.faixaComp[c] === f; }).sort(function (a, b) { return a.porComp[c] - b.porComp[c]; });
        var cont = {};
        al.forEach(function (r) { r.erradas.filter(function (k, i, l) { return l.indexOf(k) === i; }).forEach(function (k) { if (k.indexOf(c + '|') === 0) cont[k] = (cont[k] || 0) + 1; }); });
        var frageis = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; }).slice(0, 3).map(function (k) {
          return { chave: k, cod: k.split('|')[1], desc: (av.descritores || {})[k] || '', erraram: cont[k], de: al.length };
        });
        return { alunos: al, frageis: frageis };
      }
      grupos[c] = { abaixo: grupo(0), basico: grupo(1),
        monitores: porAluno.filter(function (r) { return r.porComp[c] != null && r.porComp[c] >= 0.9; }).sort(function (a, b) { return b.porComp[c] - a.porComp[c]; }) };
    });

    return { comps: comps, porAluno: porAluno.sort(function (a, b) { return a.pct - b.pct; }), faltaram: faltaram, turma: turma, serie: serie,
      porQuestao: porQuestao, porCodigo: porCodigo, grupos: grupos };
  }

  /**
   * Avaliação importada da plataforma: só o % de acerto de cada aluno (geral e por componente, de 0 a 1).
   * notasTurma: {aluno_id: valores}; notasSerie: [valores] de todas as turmas da série.
   */
  function resultadoPct(av, alunos, notasTurma, notasSerie) {
    var comps = (av.componentes && av.componentes.length) ? av.componentes.slice() : [];
    if (!comps.length) Object.keys(notasTurma).concat([]).forEach(function (k) { Object.keys(notasTurma[k] || {}).forEach(function (c) { if (c !== 'GERAL' && comps.indexOf(c) === -1) comps.push(c); }); });
    function geral(v) { return v.GERAL != null ? v.GERAL : media(comps.map(function (c) { return v[c]; })); }
    var ativos = alunos.filter(function (a) { return a.ativo !== false; }), porAluno = [], faltaram = [];
    ativos.forEach(function (a) {
      var v = notasTurma[a.id]; if (!v) { faltaram.push(a); return; }
      var r = { aluno: a, pct: geral(v), porComp: {}, faixaComp: {}, erradas: [], acertos: null, total: null };
      comps.forEach(function (c) { if (v[c] != null) { r.porComp[c] = v[c]; r.faixaComp[c] = faixaDe(av, v[c]); } });
      r.faixa = r.pct == null ? null : faixaDe(av, r.pct);
      porAluno.push(r);
    });
    var turma = { avaliados: porAluno.length, previstos: ativos.length, media: media(porAluno.map(function (r) { return r.pct; })), porComp: {}, faixas: [0, 0, 0], faixasComp: {} };
    porAluno.forEach(function (r) { if (r.faixa != null) turma.faixas[r.faixa]++; });
    comps.forEach(function (c) {
      turma.porComp[c] = media(porAluno.map(function (r) { return r.porComp[c]; }));
      var f = [0, 0, 0]; porAluno.forEach(function (r) { if (r.faixaComp[c] != null) f[r.faixaComp[c]]++; }); turma.faixasComp[c] = f;
    });
    var serie = { avaliados: (notasSerie || []).length, media: media((notasSerie || []).map(geral)), porComp: {} };
    comps.forEach(function (c) { serie.porComp[c] = media((notasSerie || []).map(function (v) { return v[c]; })); });
    var grupos = {};
    comps.forEach(function (c) {
      function grupo(f) { return { alunos: porAluno.filter(function (r) { return r.faixaComp[c] === f; }).sort(function (a, b) { return a.porComp[c] - b.porComp[c]; }), frageis: [] }; }
      grupos[c] = { abaixo: grupo(0), basico: grupo(1), monitores: porAluno.filter(function (r) { return r.porComp[c] != null && r.porComp[c] >= 0.9; }).sort(function (a, b) { return b.porComp[c] - a.porComp[c]; }) };
    });
    return { tipo: 'percentual', comps: comps, porAluno: porAluno.sort(function (a, b) { return a.pct - b.pct; }), faltaram: faltaram, turma: turma, serie: serie, porQuestao: [], porCodigo: [], grupos: grupos };
  }

  var api = { resultadoPct: resultadoPct, LETRAS: LETRAS, validas: validas, fez: fez, faixaDe: faixaDe, corrigir: corrigir, resultadoTurma: resultadoTurma, componentes: componentes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.LUME_CALC = api;
})(typeof window !== 'undefined' ? window : this);
