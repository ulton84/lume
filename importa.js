// Lume Escolas · leitura de listas de alunos (Excel/CSV exportados da SED ou feitos pela escola).
// Lê no próprio aparelho e aproveita SÓ: nome, nº de chamada, turma e situação (ativo ou saiu).
// RA, data de nascimento e qualquer outra coluna são ignorados e nunca saem do aparelho.
(function (raiz) {
  function norm(s) {
    return String(s == null ? '' : s).replace(/[º°]/g, 'O').replace(/ª/g, 'A').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  }
  function bonito(s) {   // "MARIA DA SILVA" -> "Maria da Silva"
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().split(' ').map(function (p, i) {
      return i && /^(de|da|do|dos|das|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
  }

  var R = {
    nome: /^(NOME( COMPLETO)?( DO| DA)?( \(?A\)?)? ?(ALUNO|ALUNA|ALUNO\(A\)|ESTUDANTE)?|ALUNO|ALUNA|ALUNO\(A\)|ESTUDANTE|NOME DO\(A\) ALUNO\(A\))$/,
    numero: /^(N|NO|N O|NR|NRO|NUM|NUMERO|N CHAMADA|NO CHAMADA|NO DE CHAMADA|N O DE CHAMADA|NUMERO DE CHAMADA|NUMERO CHAMADA|CHAMADA|N DE CHAMADA|NR DE CHAMADA)$/,
    situacao: /SITUACAO|STATUS/,
    turma: /^(TURMA|CLASSE|TURMA\/CLASSE|DESCRICAO DA TURMA|DESCRICAO TURMA|SERIE\/TURMA|ANO\/TURMA|TURMA \(SERIE\))$/,
    serie: /^(SERIE|ANO|ANO\/SERIE|SERIE\/ANO|ANO ESCOLAR|GRAU\/SERIE)$/,
    proibido: /MAE|PAI|RESPONS|SOCIAL|ESCOLA|PROFESSOR|DIRETOR/
  };

  /** Acha a linha de cabeçalho e as colunas úteis. linhas: [[texto]] */
  function detectar(linhas) {
    var melhor = null;
    for (var r = 0; r < Math.min(linhas.length, 40); r++) {
      var cols = { nome: -1, numero: -1, situacao: -1, turma: -1, serie: -1 };
      (linhas[r] || []).forEach(function (c, i) {
        var n = norm(c); if (!n) return;
        if (cols.nome < 0 && R.nome.test(n) && !R.proibido.test(n)) cols.nome = i;
        else if (cols.numero < 0 && R.numero.test(n)) cols.numero = i;
        else if (cols.situacao < 0 && R.situacao.test(n)) cols.situacao = i;
        else if (cols.turma < 0 && R.turma.test(n)) cols.turma = i;
        else if (cols.serie < 0 && R.serie.test(n)) cols.serie = i;
      });
      if (cols.nome >= 0) {
        var pontos = 1 + (cols.numero >= 0) + (cols.situacao >= 0) + (cols.turma >= 0) + (cols.serie >= 0);
        if (!melhor || pontos > melhor.pontos) melhor = { cab: r, cols: cols, pontos: pontos };
      }
    }
    return melhor;
  }

  var PARADAS = ['ANO', 'ANOS', 'SERIE', 'EF', 'EM', 'ENSINO', 'FUNDAMENTAL', 'MEDIO', 'MANHA', 'TARDE', 'NOITE', 'NOTURNO', 'INTEGRAL', 'TURMA', 'CLASSE',
    'DE', 'DO', 'DA', 'I', 'II', 'PERIODO', 'TURNO', 'REGULAR', 'INICIAIS', 'FINAIS', 'ORD', 'NO', 'AO', 'SALA'];
  /** "5º ANO A - MANHÃ" -> {etapa:'EF', ano:5, letra:'A', turno:'Manhã'} */
  function interpretarTurma(texto) {
    var t = norm(String(texto || '').replace(/[º°ª]/g, ' ORD ')); if (!t) return null;
    t = t.replace(/\b(\d)([A-Z])\b/g, '$1 $2');
    var etapa = /SERIE|MEDIO|\bEM\b/.test(t) ? 'EM' : 'EF';
    var tk = t.split(/[\s\-–\/,():;]+/).filter(Boolean);
    var i = -1; for (var k = 0; k < tk.length; k++) if (/^\d$/.test(tk[k])) { i = k; break; }
    if (i < 0) return null;
    var ano = Number(tk[i]); if (etapa === 'EM' && ano > 4) etapa = 'EF';
    function boa(w) { return PARADAS.indexOf(w) === -1 && /^([A-Z]{1,4}|\d{1,2})$/.test(w); }
    var letra = '';
    for (k = i + 1; k < tk.length && !letra; k++) if (boa(tk[k])) letra = tk[k];
    for (k = i - 1; k >= 0 && !letra; k--) if (boa(tk[k]) && !/^\d+$/.test(tk[k])) letra = tk[k];
    if (!letra) return null;
    var turno = /MANHA/.test(t) ? 'Manhã' : /TARDE/.test(t) ? 'Tarde' : /NOITE|NOTURNO/.test(t) ? 'Noite' : /INTEGRAL/.test(t) ? 'Integral' : '';
    return { etapa: etapa, ano: ano, letra: letra, turno: turno };
  }

  function ativo(s) {
    var n = norm(s); if (!n) return true;
    if (/TRANSF|REMANEJ|ABANDON|BAIXA|NAO COMPARE|NCOM|FALEC|RECLASS|CESSAD|DESIST|EVAD|INATIV|CANCEL/.test(n)) return false;
    return true;
  }

  /** Procura a turma escrita fora da tabela (título do relatório ou nome da aba). */
  function turmaDoTitulo(linhas, cab, nomeAba) {
    for (var r = 0; r < Math.min(cab, 20); r++) {
      var txt = (linhas[r] || []).join(' ');
      if (/ANO|SERIE|TURMA|CLASSE/.test(norm(txt))) { var t = interpretarTurma(txt.replace(/.*?(TURMA|CLASSE)\s*:?/i, '')) || interpretarTurma(txt); if (t) return t; }
    }
    return nomeAba ? interpretarTurma(nomeAba) : null;
  }

  /** Extrai os alunos de uma tabela já detectada. */
  function extrair(linhas, det, turmaPadrao) {
    var c = det.cols, out = [], seq = 0;
    for (var r = det.cab + 1; r < linhas.length; r++) {
      var l = linhas[r] || [], nome = String(l[c.nome] == null ? '' : l[c.nome]).replace(/\s+/g, ' ').trim();
      if (nome.length < 3 || /\d{3,}/.test(nome) || /^TOTAL|^QUANTIDADE|^LEGENDA/.test(norm(nome))) continue;
      seq++;
      var txtT = c.turma >= 0 ? String(l[c.turma] || '') : '';
      if (c.serie >= 0) txtT = String(l[c.serie] || '') + ' ' + txtT;
      var turma = (txtT.trim() && interpretarTurma(txtT)) || turmaPadrao || null;
      var num = c.numero >= 0 ? parseInt(String(l[c.numero]).replace(/\D/g, ''), 10) : NaN;
      out.push({ nome: /^[A-ZÀ-Ú\s'\-]+$/.test(nome) ? bonito(nome) : nome, numero: num > 0 && num < 100 ? num : null, ativo: c.situacao >= 0 ? ativo(l[c.situacao]) : true, turma: turma, linha: r + 1 });
    }
    // sem coluna de nº: numera na ordem da lista, por turma
    var cont = {};
    out.forEach(function (a) { if (a.numero == null) { var k = a.turma ? a.turma.etapa + a.turma.ano + a.turma.letra : '?'; cont[k] = (cont[k] || 0) + 1; a.numero = cont[k]; } });
    return out;
  }

  /** CSV simples (separador ; ou ,) -> [[texto]] */
  function lerCsv(texto) {
    var sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    return texto.split(/\r?\n/).map(function (linha) {
      var cel = [], cur = '', aspas = false;
      for (var i = 0; i < linha.length; i++) {
        var ch = linha[i];
        if (ch === '"') { if (aspas && linha[i + 1] === '"') { cur += '"'; i++; } else aspas = !aspas; }
        else if (ch === sep && !aspas) { cel.push(cur); cur = ''; }
        else cur += ch;
      }
      cel.push(cur); return cel;
    });
  }

  /** Tabelas de um arquivo .htm/.html (ex.: "Lista de Alunos" exportada da SED) -> [{nome, linhas}] */
  function lerHtml(texto, DOMParserClasse) {
    var doc = new (DOMParserClasse || DOMParser)().parseFromString(texto, 'text/html');
    var titulo = (doc.querySelector('title') || {}).textContent || '';
    return Array.prototype.map.call(doc.querySelectorAll('table'), function (tb, i) {
      var linhas = Array.prototype.map.call(tb.querySelectorAll('tr'), function (tr) {
        return Array.prototype.map.call(tr.querySelectorAll('th,td'), function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); });
      });
      return { nome: (titulo || 'Tabela') + (i ? ' ' + (i + 1) : ''), linhas: linhas };
    });
  }

  /* ---------- grade horária ---------- */
  var DIAS_TXT = [[/^(2|2A|2O|SEG|SEGUNDA)/, 1], [/^(3|3A|3O|TER|TERCA)/, 2], [/^(4|4A|4O|QUA|QUARTA)/, 3], [/^(5|5A|5O|QUI|QUINTA)/, 4], [/^(6|6A|6O|SEX|SEXTA)/, 5], [/^(SAB|SABADO)/, 6]];
  function diaDe(txt) {
    var n = norm(String(txt || '').replace(/ª/g, 'A')).replace(/[\s\-]*FEIRA$/, '').trim();
    if (!n) return 0;
    for (var i = 0; i < DIAS_TXT.length; i++) if (DIAS_TXT[i][0].test(n)) return DIAS_TXT[i][1];
    return 0;
  }
  function aulaDe(txt) { var m = /^(\d{1,2})\s*(A|O|ª|º)?\s*(AULA)?$/.exec(norm(txt)); return m ? Number(m[1]) : 0; }
  function horario(txt) { var m = /(\d{1,2})[:h](\d{2})\s*(?:-|–|ÀS|AS|A)\s*(\d{1,2})[:h](\d{2})/i.exec(String(txt || '')); return m ? [('0' + m[1]).slice(-2) + ':' + m[2], ('0' + m[3]).slice(-2) + ':' + m[4]] : null; }
  var COMP_TXT = [[/^(LP|PORT|PORTUGUES|LINGUA PORTUGUESA|L PORTUGUESA)$/, 'LP'], [/^(MAT|MATEMATICA)$/, 'MAT'], [/^(CIE|CIENCIAS)$/, 'CIE'], [/^(HIS|HIST|HISTORIA)$/, 'HIS'],
    [/^(GEO|GEOGRAFIA)$/, 'GEO'], [/^(ART|ARTE|ARTES)$/, 'ART'], [/^(EDF|ED FISICA|EDUCACAO FISICA|E FISICA)$/, 'EDF'], [/^(ING|INGLES|LINGUA INGLESA)$/, 'ING'],
    [/^(BIO|BIOLOGIA)$/, 'BIO'], [/^(FIS|FISICA)$/, 'FIS'], [/^(QUI|QUIMICA)$/, 'QUI'], [/^(FIL|FILO|FILOSOFIA)$/, 'FIL'], [/^(SOC|SOCIOLOGIA)$/, 'SOC'],
    [/^(FIN|EDUCACAO FINANCEIRA)$/, 'FIN'], [/^(TEC|TECNOLOGIA)$/, 'TEC'], [/^(RED|REDACAO)$/, 'RED']];
  /** "PORTUGUÊS" -> "LP"; o que não reconhece fica com o nome escrito (ex.: "Sala de Leitura") */
  function compDe(txt) {
    var n = norm(txt).replace(/\s+/g, ' '); if (!n) return '';
    for (var i = 0; i < COMP_TXT.length; i++) if (COMP_TXT[i][0].test(n)) return COMP_TXT[i][1];
    return bonito(String(txt).trim()).slice(0, 30);
  }
  function separarProf(txt) {   // "LP - Ana" / "LP / Ana" / "LP (Ana)" / "LP\nAna"
    var t = String(txt || '').trim(); var m = /^(.+?)\s*(?:\n|\s[-–\/]\s|\(|:)\s*(.+?)\)?$/.exec(t);
    return m ? [m[1], m[2]] : [t, ''];
  }

  /** Lê a grade de todas as abas. Devolve {itens:[{turma, dia, aula, comp, prof, inicio, fim}], formato} */
  function lerGrade(abas) {
    var itens = [], formatos = [];
    abas.forEach(function (aba) {
      var L = aba.linhas, turnoAba = /MANHA/.test(norm(aba.nome)) ? 'Manhã' : /TARDE/.test(norm(aba.nome)) ? 'Tarde' : /NOITE/.test(norm(aba.nome)) ? 'Noite' : /INTEGRAL/.test(norm(aba.nome)) ? 'Integral' : '';
      for (var r0 = 0; r0 < Math.min(L.length, 15) && !turnoAba; r0++) { var tx = norm((L[r0] || []).join(' ')); if (/MANHA/.test(tx)) turnoAba = 'Manhã'; else if (/TARDE/.test(tx)) turnoAba = 'Tarde'; else if (/NOITE/.test(tx)) turnoAba = 'Noite'; }
      // A) uma linha por aula: Turma | Dia | Aula | Componente | Professor
      var cab = -1, c = {};
      for (var r = 0; r < Math.min(L.length, 20) && cab < 0; r++) {
        var cc = {}; (L[r] || []).forEach(function (h, i) { var n = norm(h);
          if (/^TURMA|^CLASSE/.test(n)) cc.turma = i; else if (/^DIA/.test(n)) cc.dia = i; else if (/^(N )?AULA|^AULA N|^HORA AULA$/.test(n)) cc.aula = i;
          else if (/^(COMPONENTE|DISCIPLINA|MATERIA)/.test(n)) cc.comp = i; else if (/^PROFESSOR/.test(n)) cc.prof = i;
          else if (/^(INICIO|ENTRADA|HORA INICIO)/.test(n)) cc.ini = i; else if (/^(FIM|TERMINO|SAIDA|HORA FIM)/.test(n)) cc.fim = i; else if (/^HORARIO/.test(n)) cc.hor = i; });
        if (cc.turma != null && cc.dia != null && cc.aula != null && cc.comp != null) { cab = r; c = cc; }
      }
      if (cab >= 0) {
        formatos.push('lista');
        for (r = cab + 1; r < L.length; r++) {
          var l = L[r] || [], t = interpretarTurma(l[c.turma]), d = diaDe(l[c.dia]), au = aulaDe(l[c.aula]);
          if (!t || !d || !au) continue;
          if (!t.turno) t.turno = turnoAba;
          var h = c.hor != null ? horario(l[c.hor]) : null;
          itens.push({ turma: t, dia: d, aula: au, comp: compDe(l[c.comp]), prof: c.prof != null ? String(l[c.prof] || '').trim() : '', inicio: c.ini != null ? String(l[c.ini] || '').trim() : (h ? h[0] : ''), fim: c.fim != null ? String(l[c.fim] || '').trim() : (h ? h[1] : '') });
        }
        return;
      }
      // B) turmas nas colunas, dias/aulas nas linhas (com linha "Professores" e linhas de especialistas)
      var rT = -1, colsT = [];
      for (r = 0; r < Math.min(L.length, 25) && rT < 0; r++) {
        var ct = []; (L[r] || []).forEach(function (h, i) { var t = /\d/.test(h || '') && String(h).length <= 25 ? interpretarTurma(h) : null; if (t) ct.push([i, t]); });
        if (ct.length >= 2) { rT = r; colsT = ct; }
      }
      if (rT >= 0) {
        formatos.push('grade');
        var colRot = colsT[0][0] - 1, titular = {}, especialista = {}, dia = 0;
        colsT.forEach(function (x) { if (!x[1].turno) x[1].turno = turnoAba; });
        for (r = rT + 1; r < L.length; r++) {
          var l2 = L[r] || [], rot = String(l2[colRot] || '').trim(), nr = norm(rot);
          for (var k = 0; k < colRot; k++) { var dd = diaDe(l2[k]); if (dd) dia = dd; }
          var au2 = aulaDe(rot);
          if (/^PROFESSOR/.test(nr)) { colsT.forEach(function (x) { titular[x[0]] = String(l2[x[0]] || '').trim(); }); continue; }
          if (au2 && dia) {
            var hh = null; for (k = 0; k < colRot && !hh; k++) hh = horario(l2[k]);
            colsT.forEach(function (x) {
              var cel = String(l2[x[0]] || '').trim(); if (!cel) return;
              var sp = separarProf(cel), comp = compDe(sp[0]), prof = sp[1] || (especialista[norm(sp[0])] || {})[x[0]] || titular[x[0]] || '';
              itens.push({ turma: x[1], dia: dia, aula: au2, comp: comp, prof: prof, inicio: hh ? hh[0] : '', fim: hh ? hh[1] : '' });
            });
            continue;
          }
          if (nr && !au2) { var mp = {}; colsT.forEach(function (x) { var v = String(l2[x[0]] || '').trim(); if (v) mp[x[0]] = v; }); if (Object.keys(mp).length) especialista[nr] = mp; }
        }
        return;
      }
      // C) uma aba por turma: dias nas colunas, aulas nas linhas
      var tAba = interpretarTurma(aba.nome); var rD = -1, colsD = [];
      for (r = 0; r < Math.min(L.length, 20) && rD < 0; r++) { var cd = []; (L[r] || []).forEach(function (h, i) { var d2 = diaDe(h); if (d2 && !/^\d/.test(String(h).trim())) cd.push([i, d2]); }); if (cd.length >= 3) { rD = r; colsD = cd; } }
      if (rD < 0) return;
      if (!tAba) for (r = 0; r < rD && !tAba; r++) tAba = interpretarTurma((L[r] || []).join(' '));
      if (!tAba) return;
      if (!tAba.turno) tAba.turno = turnoAba;
      formatos.push('aba por turma');
      for (r = rD + 1; r < L.length; r++) {
        var l3 = L[r] || [], au3 = 0, h3 = null;
        for (k = 0; k < colsD[0][0]; k++) { au3 = au3 || aulaDe(l3[k]); h3 = h3 || horario(l3[k]); }
        if (!au3) continue;
        colsD.forEach(function (x) { var cel = String(l3[x[0]] || '').trim(); if (!cel) return; var sp = separarProf(cel); itens.push({ turma: tAba, dia: x[1], aula: au3, comp: compDe(sp[0]), prof: sp[1], inicio: h3 ? h3[0] : '', fim: h3 ? h3[1] : '' }); });
      }
    });
    return { itens: itens, formato: formatos.filter(function (f, i, a) { return a.indexOf(f) === i; }).join(', ') };
  }

  var api = { lerGrade: lerGrade, compDe: compDe, diaDe: diaDe, lerHtml: lerHtml, norm: norm, bonito: bonito, detectar: detectar, interpretarTurma: interpretarTurma, ativo: ativo, turmaDoTitulo: turmaDoTitulo, extrair: extrair, lerCsv: lerCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.LUME_IMPORTA = api;
})(typeof window !== 'undefined' ? window : this);
