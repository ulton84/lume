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

  var api = { lerHtml: lerHtml, norm: norm, bonito: bonito, detectar: detectar, interpretarTurma: interpretarTurma, ativo: ativo, turmaDoTitulo: turmaDoTitulo, extrair: extrair, lerCsv: lerCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.LUME_IMPORTA = api;
})(typeof window !== 'undefined' ? window : this);
