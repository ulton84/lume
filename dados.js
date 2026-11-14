// Lume Escolas · camada de dados.
// Mesma interface para dois "motores":
//   - Supabase (quando config.js tem URL e chave anon);
//   - demonstração (sem banco: dados de exemplo no localStorage deste navegador).
// As telas só usam window.D, nunca o Supabase direto.
(function () {
  var cfg = window.LUME_CONFIG || {};
  var usarSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);

  function erroPt(e) {
    var m = String((e && (e.message || e.error_description)) || e || '');
    var mapa = [
      [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
      [/Email not confirmed/i, 'Confirme seu e-mail: abra a mensagem que o Lume enviou e toque no link. Depois entre de novo.'],
      [/User already registered/i, 'Este e-mail já tem conta. Use "Entrar" ou "Esqueci a senha".'],
      [/Password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
      [/rate limit|too many/i, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'],
      [/apoios_um_por_semana/i, 'Este professor já tem um apoio agendado nesta semana. A regra é um apoio por semana para cada professor.'],
      [/duplicate key|unique/i, 'Já existe um cadastro igual a este.'],
      [/row-level security|permission denied/i, 'Você não tem permissão para fazer isso.'],
      [/Failed to fetch|NetworkError|Load failed/i, 'Sem conexão com o servidor. Confira a internet e tente de novo.']
    ];
    for (var i = 0; i < mapa.length; i++) if (mapa[i][0].test(m)) return new Error(mapa[i][1]);
    return new Error(m || 'Algo deu errado. Tente de novo.');
  }
  function ok(r) { if (r.error) throw erroPt(r.error); return r.data; }

  /* =====================  Supabase  ===================== */
  function motorSupabase() {
    var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    var D = { modo: 'supabase' };
    D.entrar = function (email, senha) { return sb.auth.signInWithPassword({ email: email, password: senha }).then(ok); };
    D.cadastrar = function (email, senha, nome) {
      return sb.auth.signUp({ email: email, password: senha, options: { data: { nome: nome }, emailRedirectTo: location.origin + location.pathname } }).then(ok)
        .then(function (d) { return { precisaConfirmar: !d.session }; });
    };
    D.esqueci = function (email) { return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#nova-senha' }).then(ok); };
    D.novaSenha = function (senha) { return sb.auth.updateUser({ password: senha }).then(ok); };
    D.sair = function () { return sb.auth.signOut(); };
    D.aoMudarSessao = function (fn) { sb.auth.onAuthStateChange(function (ev) { fn(ev); }); };
    D.usuarioAtual = function () { return sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; return s ? { id: s.user.id, email: s.user.email } : null; }); };
    D.carregarPerfil = function () {
      return D.usuarioAtual().then(function (u) {
        if (!u) return null;
        return Promise.all([
          sb.from('perfis').select('*').eq('id', u.id).maybeSingle().then(ok),
          sb.rpc('sou_super').then(ok)
        ]).then(function (r) {
          var p = r[0], sup = !!r[1];
          if (!p && !sup) return sb.rpc('aceitar_convite').then(ok).then(function (aceitou) { return aceitou ? D.carregarPerfil() : { id: u.id, email: u.email, semEscola: true }; });
          if (!p) return { id: u.id, email: u.email, nome: '', papel: 'super', escola: null, turmas: [], super: true };
          return Promise.all([
            sb.from('escolas').select('*').eq('id', p.escola_id).single().then(ok),
            sb.from('professor_turmas').select('turma_id').eq('perfil_id', p.id).then(ok)
          ]).then(function (r2) {
            p.escola = r2[0]; p.turmas = r2[1].map(function (x) { return x.turma_id; }); p.super = sup;
            return p;
          });
        });
      });
    };
    D.escolas = {
      listar: function () { return sb.from('escolas').select('*').order('nome').then(ok); },
      criar: function (e) { return sb.from('escolas').insert({ nome: e.nome, cidade: e.cidade || '' }).select().single().then(ok); },
      salvar: function (e) { return sb.from('escolas').update({ nome: e.nome, cidade: e.cidade || '', logo: e.logo || '', ano_letivo: e.ano_letivo }).eq('id', e.id).select().single().then(ok); }
    };
    D.convites = {
      listar: function (escola) { return sb.from('convites').select('*').eq('escola_id', escola).is('usado_em', null).order('criado_em', { ascending: false }).then(ok); },
      criar: function (c) { return sb.from('convites').insert({ escola_id: c.escola_id, email: c.email.toLowerCase().trim(), nome: c.nome || '', papel: c.papel, turmas: c.turmas || [] }).select().single().then(ok); },
      apagar: function (id) { return sb.from('convites').delete().eq('id', id).then(ok); }
    };
    D.perfis = {
      listar: function (escola) { return sb.from('perfis').select('*').eq('escola_id', escola).order('nome').then(ok); },
      salvar: function (p) { return sb.from('perfis').update({ nome: p.nome, papel: p.papel, ativo: p.ativo }).eq('id', p.id).then(ok); },
      apagar: function (id) { return sb.from('perfis').delete().eq('id', id).then(ok); },
      definirTurmas: function (perfil, escola, turmas) {
        return sb.from('professor_turmas').delete().eq('perfil_id', perfil).then(ok).then(function () {
          if (!turmas.length) return [];
          return sb.from('professor_turmas').insert(turmas.map(function (t) { return { perfil_id: perfil, turma_id: t, escola_id: escola }; })).then(ok);
        });
      }
    };
    D.professorTurmas = { listar: function (escola) { return sb.from('professor_turmas').select('*').eq('escola_id', escola).then(ok); } };
    D.turmas = {
      listar: function (escola, anoLetivo) { return sb.from('turmas').select('*').eq('escola_id', escola).eq('ano_letivo', anoLetivo).order('etapa').order('ano').order('letra').then(ok); },
      salvar: function (t) {
        var dados = { escola_id: t.escola_id, etapa: t.etapa || 'EF', ano: t.ano, letra: t.letra, turno: t.turno, ano_letivo: t.ano_letivo };
        return (t.id ? sb.from('turmas').update(dados).eq('id', t.id) : sb.from('turmas').insert(dados)).select().single().then(ok);
      },
      apagar: function (id) { return sb.from('turmas').delete().eq('id', id).then(ok); }
    };
    D.alunos = {
      listar: function (turma) { return sb.from('alunos').select('*').eq('turma_id', turma).order('numero').then(ok); },
      contar: function (escola) { return sb.from('alunos').select('turma_id').eq('escola_id', escola).eq('ativo', true).then(ok).then(function (l) { var c = {}; l.forEach(function (a) { c[a.turma_id] = (c[a.turma_id] || 0) + 1; }); return c; }); },
      salvar: function (a) {
        var dados = { escola_id: a.escola_id, turma_id: a.turma_id, numero: a.numero, nome: a.nome, ativo: a.ativo !== false };
        return (a.id ? sb.from('alunos').update(dados).eq('id', a.id) : sb.from('alunos').insert(dados)).select().single().then(ok);
      },
      salvarVarios: function (lista) { return sb.from('alunos').insert(lista.map(function (a) { return { escola_id: a.escola_id, turma_id: a.turma_id, numero: a.numero, nome: a.nome, ativo: a.ativo !== false }; })).then(ok); },
      apagar: function (id) { return sb.from('alunos').delete().eq('id', id).then(ok); }
    };
    D.avaliacoes = {
      listar: function (escola, anoLetivo) { return sb.from('avaliacoes').select('*').eq('escola_id', escola).eq('ano_letivo', anoLetivo).order('criado_em', { ascending: false }).then(ok); },
      salvar: function (a) {
        var dados = { escola_id: a.escola_id, nome: a.nome, modelo: a.modelo || 'branco', etapa: a.etapa, ano: a.ano, ano_letivo: a.ano_letivo, data: a.data || null,
          faixas: a.faixas, questoes: a.questoes || [], descritores: a.descritores || {}, tipo: a.tipo || 'questoes', componentes: a.componentes || [] };
        return (a.id ? sb.from('avaliacoes').update(dados).eq('id', a.id) : sb.from('avaliacoes').insert(dados)).select().single().then(ok);
      },
      apagar: function (id) { return sb.from('avaliacoes').delete().eq('id', id).then(ok); }
    };
    D.respostas = {
      daAvaliacao: function (av) { return sb.from('respostas').select('aluno_id,turma_id,marcadas').eq('avaliacao_id', av).then(ok); },
      salvar: function (r) {
        return sb.from('respostas').upsert({ avaliacao_id: r.avaliacao_id, aluno_id: r.aluno_id, turma_id: r.turma_id, escola_id: r.escola_id, marcadas: r.marcadas, atualizado_em: new Date().toISOString() }).then(ok);
      },
      apagar: function (av, aluno) { return sb.from('respostas').delete().eq('avaliacao_id', av).eq('aluno_id', aluno).then(ok); }
    };
    D.notas = {
      daAvaliacao: function (av) { return sb.from('notas').select('aluno_id,turma_id,valores').eq('avaliacao_id', av).then(ok); },
      salvarVarios: function (lista) {
        if (!lista.length) return Promise.resolve([]);
        return sb.from('notas').upsert(lista.map(function (n) { return { avaliacao_id: n.avaliacao_id, aluno_id: n.aluno_id, turma_id: n.turma_id, escola_id: n.escola_id, valores: n.valores, atualizado_em: new Date().toISOString() }; })).then(ok);
      },
      apagarTurma: function (av, turma) { return sb.from('notas').delete().eq('avaliacao_id', av).eq('turma_id', turma).then(ok); }
    };
    D.descImp = {
      listar: function (av) { return sb.from('desc_importados').select('escopo,itens').eq('avaliacao_id', av).then(ok); },
      salvar: function (d) { return sb.from('desc_importados').upsert({ avaliacao_id: d.avaliacao_id, escola_id: d.escola_id, escopo: d.escopo, itens: d.itens, atualizado_em: new Date().toISOString() }).then(ok); }
    };
    D.horarios = {
      listar: function (escola) { return sb.from('horarios').select('*').eq('escola_id', escola).order('turno').order('aula').then(ok); },
      salvarTurno: function (escola, turno, lista) {
        return sb.from('horarios').delete().eq('escola_id', escola).eq('turno', turno).then(ok).then(function () {
          if (!lista.length) return [];
          return sb.from('horarios').insert(lista.map(function (h) { return { escola_id: escola, turno: turno, aula: h.aula, inicio: h.inicio || '', fim: h.fim || '' }; })).then(ok);
        });
      }
    };
    D.grade = {
      listar: function (escola) { return sb.from('grade').select('*').eq('escola_id', escola).then(ok); },
      salvar: function (g) {
        if (!g.componente && !g.professor_id && !g.professor_nome) return sb.from('grade').delete().eq('turma_id', g.turma_id).eq('dia', g.dia).eq('aula', g.aula).then(ok);
        return sb.from('grade').upsert({ escola_id: g.escola_id, turma_id: g.turma_id, dia: g.dia, aula: g.aula, componente: g.componente || '', professor_id: g.professor_id || null, professor_nome: g.professor_nome || '' }, { onConflict: 'turma_id,dia,aula' }).then(ok);
      },
      salvarVarios: function (lista) {
        if (!lista.length) return Promise.resolve([]);
        return sb.from('grade').upsert(lista.map(function (g) { return { escola_id: g.escola_id, turma_id: g.turma_id, dia: g.dia, aula: g.aula, componente: g.componente || '', professor_id: g.professor_id || null, professor_nome: g.professor_nome || '' }; }), { onConflict: 'turma_id,dia,aula' }).then(ok);
      }
    };
    D.apoios = {
      listar: function (escola, de, ate) { return sb.from('apoios').select('*').eq('escola_id', escola).gte('data', de).lte('data', ate).neq('status', 'cancelado').order('data').order('aula').then(ok); },
      meus: function (perfil) { return sb.from('apoios').select('*').eq('professor_id', perfil).neq('status', 'cancelado').order('data', { ascending: false }).then(ok); },
      salvar: function (a) {
        var dados = { escola_id: a.escola_id, data: a.data, turma_id: a.turma_id, aula: a.aula, componente: a.componente || '', professor_id: a.professor_id || null, professor_nome: a.professor_nome || '',
          apoiador_id: a.apoiador_id || null, apoiador_nome: a.apoiador_nome || '', foco: a.foco || '', status: a.status || 'agendado', devolutiva: a.devolutiva || {} };
        return (a.id ? sb.from('apoios').update(dados).eq('id', a.id) : sb.from('apoios').insert(dados)).select().single().then(ok);
      }
    };
    D.flu = {
      cadernos: function (escola) { return sb.from('flu_cadernos').select('*').eq('escola_id', escola).order('nome').then(ok); },
      salvarCaderno: function (c) {
        var dados = { escola_id: c.escola_id, codigo: c.codigo, nome: c.nome, ano: c.ano, conteudo: c.conteudo };
        return (c.id ? sb.from('flu_cadernos').update(dados).eq('id', c.id) : sb.from('flu_cadernos').insert(dados)).select().single().then(ok);
      },
      apagarCaderno: function (id) { return sb.from('flu_cadernos').delete().eq('id', id).then(ok); },
      resultados: function (escola) { return sb.from('flu_resultados').select('id,turma_id,aluno_id,caderno,data,palavras,canonicas,pseudo,texto,precisao,compreensao,perfil,aplicador_nome').eq('escola_id', escola).order('data', { ascending: false }).then(ok); },
      salvar: function (r) { return sb.from('flu_resultados').insert(r).then(ok); },
      apagar: function (id) { return sb.from('flu_resultados').delete().eq('id', id).then(ok); }
    };
    return D;
  }

  /* =====================  Demonstração (sem banco)  ===================== */
  function motorDemo() {
    var CH = 'lume-escolas-demo', CS = 'lume-escolas-demo-sessao';
    function uid() { return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
    function ler() { try { var v = JSON.parse(localStorage.getItem(CH)); if (v && v.versao === 7) return v; } catch (e) {} return semente(); }
    function gravar(b) { try { localStorage.setItem(CH, JSON.stringify(b)); } catch (e) {} }
    function sessao() { try { return localStorage.getItem(CS) || ''; } catch (e) { return ''; } }
    function semente() {
      var ano = new Date().getFullYear(), esc = { id: 'esc1', nome: 'Escola de Demonstração', cidade: 'São Paulo', logo: '', ano_letivo: ano };
      var b = { versao: 7, escolas: [esc], contas: [], perfis: [], convites: [], turmas: [], professor_turmas: [], alunos: [], superadmins: ['super@demo.lume'], avaliacoes: [], respostas: [], horarios: [], grade: [], apoios: [], flu_cadernos: [], flu_resultados: [], notas: [], desc_importados: [] };
      [['gestor@demo.lume', 'Gestão Demonstração', 'gestor'], ['prof@demo.lume', 'Profª Ana (exemplo)', 'professor'], ['super@demo.lume', '', null]].forEach(function (u) {
        var id = uid(); b.contas.push({ id: id, email: u[0], senha: 'demo123' });
        if (u[2]) b.perfis.push({ id: id, escola_id: esc.id, nome: u[1], email: u[0], papel: u[2], ativo: true });
      });
      [['EF', 1, 'A'], ['EF', 2, 'A'], ['EF', 3, 'A'], ['EF', 4, 'A'], ['EF', 5, 'A'], ['EF', 5, 'B'], ['EF', 7, 'A'], ['EM', 1, 'A'], ['EM', 2, 'Técnico']].forEach(function (x) {
        var t = [x[1], x[2]];
        var tt = { id: uid(), escola_id: esc.id, etapa: x[0], ano: t[0], letra: t[1], turno: x[0] === 'EM' ? 'Noite' : t[0] < 3 ? 'Tarde' : 'Manhã', ano_letivo: ano };
        b.turmas.push(tt);
        for (var n = 1; n <= 6; n++) b.alunos.push({ id: uid(), escola_id: esc.id, turma_id: tt.id, numero: n, nome: 'Aluno Exemplo ' + n, ativo: true });
      });
      var prof = b.perfis.filter(function (p) { return p.papel === 'professor'; })[0];
      b.professor_turmas.push({ perfil_id: prof.id, turma_id: b.turmas[4].id, escola_id: esc.id });
      // avaliação de exemplo do 5º ano com respostas inventadas (pseudoaleatórias, sempre iguais)
      var M = window.LUME_MODELOS, qs = [], gab = 'ACBDABDCAB';
      ['LP', 'MAT'].forEach(function (c, ci) { for (var i = 0; i < 10; i++) qs.push({ n: qs.length + 1, comp: c, gab: gab.charAt((i + ci * 3) % 10), cod: 'D' + (c === 'LP' ? [1, 3, 4, 6, 1, 3, 4, 11, 12, 14][i] : [13, 17, 18, 19, 20, 21, 24, 26, 27, 28][i]) }); });
      var av = { id: uid(), escola_id: esc.id, nome: 'Simulado SARESP (exemplo)', modelo: 'saeb5', etapa: 'EF', ano: 5, ano_letivo: ano, data: ano + '-10-15',
        faixas: M ? M.FAIXAS_SAEB : { limites: [50, 70], nomes: ['Abaixo do básico', 'Básico', 'Adequado'] }, questoes: qs, descritores: M ? M.MODELOS[0].descritores : {}, criado_em: new Date().toISOString() };
      b.avaliacoes.push(av);
      var semente = 7; function rnd() { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; }
      b.alunos.filter(function (a) { var t = b.turmas.filter(function (x) { return x.id === a.turma_id; })[0]; return t.ano === 5; }).forEach(function (a, k) {
        if (k === 5) return; // um aluno faltou
        var nivel = [0.25, 0.45, 0.6, 0.75, 0.9, 0.55, 0.35, 0.8, 0.65, 0.95, 0.5, 0.3][k % 12];
        var m = qs.map(function (q, i) { var r = rnd(); if (r < nivel * (i % 4 === 2 ? 0.7 : 1)) return q.gab; return r > 0.97 ? '-' : 'ABCD'.charAt(Math.floor(rnd() * 4)); }).join('');
        b.respostas.push({ avaliacao_id: av.id, aluno_id: a.id, turma_id: a.turma_id, escola_id: esc.id, marcadas: m });
      });
      // horários e grade de exemplo
      [['Manhã', ['07:00', '07:50', '08:40', '09:50', '10:40', '11:30']], ['Tarde', ['13:00', '13:50', '14:40', '15:50', '16:40', '17:30']], ['Noite', ['19:00', '19:45', '20:30', '21:30', '22:15', '23:00']]].forEach(function (h) {
        for (var a = 1; a <= 5; a++) b.horarios.push({ escola_id: esc.id, turno: h[0], aula: a, inicio: h[1][a - 1], fim: h[1][a] });
      });
      var profs = { ana: prof.id }, nomesP = ['Prof. Carlos (exemplo)', 'Profª Dora (exemplo)', 'Prof. Edu (exemplo)', 'Profª Fê (exemplo)'];
      var rot = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'ING'];
      b.turmas.forEach(function (t, ti) {
        for (var dia = 1; dia <= 5; dia++) for (var a = 1; a <= 5; a++) {
          var comp = rot[(dia * 3 + a + ti) % rot.length], g = { id: uid(), escola_id: esc.id, turma_id: t.id, dia: dia, aula: a, componente: comp, professor_id: null, professor_nome: '' };
          if (t.ano === 5 && t.letra === 'A' && (comp === 'LP' || comp === 'MAT' || comp === 'CIE' || comp === 'HIS' || comp === 'GEO')) g.professor_id = profs.ana;
          else g.professor_nome = nomesP[(ti + a) % nomesP.length];
          b.grade.push(g);
        }
      });
      // resultados de fluência de exemplo no 1º A e no 2º A
      var PF = ['Pré-leitor 1', 'Pré-leitor 2', 'Pré-leitor 3', 'Pré-leitor 4', 'Leitor iniciante', 'Leitor fluente'];
      b.turmas.filter(function (t) { return t.etapa === 'EF' && t.ano <= 2; }).forEach(function (t, ti) {
        b.alunos.filter(function (a) { return a.turma_id === t.id; }).forEach(function (a, k) {
          if (k === 5) return;
          var n = [1, 3, 4, 5, 2][(k + ti) % 5] + (t.ano === 2 ? 1 : 0); n = Math.min(5, n);
          var pal = [0, 3, 7, 12, 30, 52][n], tx = n >= 4 ? [0, 0, 0, 0, 45, 82][n] : null;
          b.flu_resultados.push({ id: uid(), escola_id: esc.id, turma_id: t.id, aluno_id: a.id, caderno: 'LUME-' + t.ano + 'A', data: new Date(Date.now() - (k + 2) * 864e5).toISOString(),
            palavras: pal, canonicas: Math.min(20, pal), pseudo: Math.round(pal * 0.6), texto: tx, precisao: tx ? (n === 5 ? 0.95 : 0.82) : null, compreensao: n === 5 ? 2 : null, perfil: PF[n], aplicador_nome: 'Profª Ana (exemplo)' });
        });
      });
      gravar(b); return b;
    }
    function espera(v) { return new Promise(function (r) { setTimeout(function () { r(JSON.parse(JSON.stringify(v === undefined ? null : v))); }, 120); }); }
    function falha(m) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error(m)); }, 120); }); }
    function eu(b) { var id = sessao(); return b.contas.filter(function (c) { return c.id === id; })[0] || null; }
    function perfilDe(b, id) { return b.perfis.filter(function (p) { return p.id === id; })[0] || null; }
    function souSuper(b) { var c = eu(b); return !!(c && b.superadmins.indexOf(c.email) !== -1); }
    function podeEscola(b, escola) { var c = eu(b), p = c && perfilDe(b, c.id); return souSuper(b) || !!(p && p.ativo && p.papel === 'gestor' && p.escola_id === escola); }
    function exigir(b, escola) { if (!podeEscola(b, escola)) throw new Error('Você não tem permissão para fazer isso.'); }
    function mudar(fn) { try { var b = ler(); var r = fn(b); gravar(b); return espera(r); } catch (e) { return falha(e.message); } }
    function usarConvite(b, conta) {
      var c = b.convites.filter(function (x) { return !x.usado_em && x.email === conta.email; })[0];
      if (!c || perfilDe(b, conta.id)) return false;
      b.perfis.push({ id: conta.id, escola_id: c.escola_id, nome: c.nome || conta.nome || '', email: conta.email, papel: c.papel, ativo: true });
      (c.turmas || []).forEach(function (t) { b.professor_turmas.push({ perfil_id: conta.id, turma_id: t, escola_id: c.escola_id }); });
      c.usado_em = new Date().toISOString();
      return true;
    }

    var D = { modo: 'demo' };
    D.entrar = function (email, senha) {
      var b = ler(), c = b.contas.filter(function (x) { return x.email === String(email).toLowerCase().trim(); })[0];
      if (!c || c.senha !== senha) return falha('E-mail ou senha incorretos.');
      try { localStorage.setItem(CS, c.id); } catch (e) {}
      return espera(true);
    };
    D.cadastrar = function (email, senha, nome) {
      email = String(email).toLowerCase().trim();
      if (String(senha).length < 6) return falha('A senha precisa ter pelo menos 6 caracteres.');
      return mudar(function (b) {
        if (b.contas.some(function (x) { return x.email === email; })) throw new Error('Este e-mail já tem conta. Use "Entrar" ou "Esqueci a senha".');
        var c = { id: uid(), email: email, senha: senha, nome: nome }; b.contas.push(c); usarConvite(b, c);
        try { localStorage.setItem(CS, c.id); } catch (e) {}
        return { precisaConfirmar: false };
      });
    };
    D.esqueci = function () { return espera(true); };
    D.novaSenha = function (senha) { return mudar(function (b) { var c = eu(b); if (c) c.senha = senha; }); };
    D.sair = function () { try { localStorage.removeItem(CS); } catch (e) {} return espera(true); };
    D.aoMudarSessao = function () {};
    D.usuarioAtual = function () { var c = eu(ler()); return espera(c ? { id: c.id, email: c.email } : null); };
    D.carregarPerfil = function () {
      var b = ler(), c = eu(b);
      if (!c) return espera(null);
      if (!perfilDe(b, c.id) && usarConvite(b, c)) gravar(b);
      var p = perfilDe(b, c.id), sup = souSuper(b);
      if (!p && !sup) return espera({ id: c.id, email: c.email, semEscola: true });
      if (!p) return espera({ id: c.id, email: c.email, nome: '', papel: 'super', escola: null, turmas: [], super: true });
      var r = Object.assign({}, p);
      r.escola = b.escolas.filter(function (e) { return e.id === p.escola_id; })[0];
      r.turmas = b.professor_turmas.filter(function (x) { return x.perfil_id === p.id; }).map(function (x) { return x.turma_id; });
      r.super = sup;
      return espera(r);
    };
    D.escolas = {
      listar: function () { var b = ler(); return espera(souSuper(b) ? b.escolas : []); },
      criar: function (e) { return mudar(function (b) { if (!souSuper(b)) throw new Error('Você não tem permissão para fazer isso.'); var n = { id: uid(), nome: e.nome, cidade: e.cidade || '', logo: '', ano_letivo: new Date().getFullYear() }; b.escolas.push(n); return n; }); },
      salvar: function (e) { return mudar(function (b) { exigir(b, e.id); var x = b.escolas.filter(function (y) { return y.id === e.id; })[0]; Object.assign(x, { nome: e.nome, cidade: e.cidade || '', logo: e.logo || '', ano_letivo: e.ano_letivo }); return x; }); }
    };
    D.convites = {
      listar: function (escola) { var b = ler(); return espera(podeEscola(b, escola) ? b.convites.filter(function (c) { return c.escola_id === escola && !c.usado_em; }) : []); },
      criar: function (c) { return mudar(function (b) { exigir(b, c.escola_id); var email = c.email.toLowerCase().trim(); if (b.convites.some(function (x) { return x.escola_id === c.escola_id && x.email === email && !x.usado_em; })) throw new Error('Já existe um convite aberto para este e-mail.'); var n = { id: uid(), escola_id: c.escola_id, email: email, nome: c.nome || '', papel: c.papel, turmas: c.turmas || [], usado_em: null, criado_em: new Date().toISOString() }; b.convites.push(n); return n; }); },
      apagar: function (id) { return mudar(function (b) { var c = b.convites.filter(function (x) { return x.id === id; })[0]; if (c) exigir(b, c.escola_id); b.convites = b.convites.filter(function (x) { return x.id !== id; }); }); }
    };
    D.perfis = {
      listar: function (escola) { var b = ler(); return espera(b.perfis.filter(function (p) { return p.escola_id === escola; })); },
      salvar: function (p) { return mudar(function (b) { var x = perfilDe(b, p.id); exigir(b, x.escola_id); Object.assign(x, { nome: p.nome, papel: p.papel, ativo: p.ativo }); }); },
      apagar: function (id) { return mudar(function (b) { var x = perfilDe(b, id); exigir(b, x.escola_id); if (eu(b).id === id) throw new Error('Você não pode apagar o próprio acesso.'); b.perfis = b.perfis.filter(function (p) { return p.id !== id; }); b.professor_turmas = b.professor_turmas.filter(function (p) { return p.perfil_id !== id; }); }); },
      definirTurmas: function (perfil, escola, turmas) { return mudar(function (b) { exigir(b, escola); b.professor_turmas = b.professor_turmas.filter(function (p) { return p.perfil_id !== perfil; }).concat(turmas.map(function (t) { return { perfil_id: perfil, turma_id: t, escola_id: escola }; })); }); }
    };
    D.professorTurmas = { listar: function (escola) { return espera(ler().professor_turmas.filter(function (p) { return p.escola_id === escola; })); } };
    D.turmas = {
      listar: function (escola, anoLetivo) { return espera(ler().turmas.filter(function (t) { return t.escola_id === escola && t.ano_letivo === anoLetivo; }).sort(function (a, b) { return (a.etapa === 'EM') - (b.etapa === 'EM') || a.ano - b.ano || a.letra.localeCompare(b.letra); })); },
      salvar: function (t) { return mudar(function (b) {
        exigir(b, t.escola_id);
        if (b.turmas.some(function (x) { return x.id !== t.id && x.escola_id === t.escola_id && x.ano_letivo === t.ano_letivo && (x.etapa || 'EF') === (t.etapa || 'EF') && x.ano === t.ano && x.letra === t.letra; })) throw new Error('Já existe esta turma.');
        if (t.id) { var x = b.turmas.filter(function (y) { return y.id === t.id; })[0]; Object.assign(x, t); return x; }
        var n = Object.assign({ id: uid() }, t); b.turmas.push(n); return n;
      }); },
      apagar: function (id) { return mudar(function (b) { var t = b.turmas.filter(function (x) { return x.id === id; })[0]; exigir(b, t.escola_id); b.turmas = b.turmas.filter(function (x) { return x.id !== id; }); b.alunos = b.alunos.filter(function (a) { return a.turma_id !== id; }); b.professor_turmas = b.professor_turmas.filter(function (p) { return p.turma_id !== id; }); }); }
    };
    D.alunos = {
      listar: function (turma) { return espera(ler().alunos.filter(function (a) { return a.turma_id === turma; }).sort(function (a, b) { return a.numero - b.numero; })); },
      contar: function (escola) { var c = {}; ler().alunos.forEach(function (a) { if (a.escola_id === escola && a.ativo) c[a.turma_id] = (c[a.turma_id] || 0) + 1; }); return espera(c); },
      salvar: function (a) { return mudar(function (b) { exigir(b, a.escola_id); if (a.id) { var x = b.alunos.filter(function (y) { return y.id === a.id; })[0]; Object.assign(x, a); return x; } var n = Object.assign({ id: uid(), ativo: true }, a); b.alunos.push(n); return n; }); },
      salvarVarios: function (lista) { return mudar(function (b) { lista.forEach(function (a) { exigir(b, a.escola_id); b.alunos.push(Object.assign({ id: uid(), ativo: true }, a)); }); }); },
      apagar: function (id) { return mudar(function (b) { var a = b.alunos.filter(function (x) { return x.id === id; })[0]; exigir(b, a.escola_id); b.alunos = b.alunos.filter(function (x) { return x.id !== id; }); }); }
    };
    function douAula(b, turma) { var c = eu(b), p = c && perfilDe(b, c.id); return !!(p && p.ativo && b.professor_turmas.some(function (x) { return x.perfil_id === p.id && x.turma_id === turma; })); }
    D.avaliacoes = {
      listar: function (escola, anoLetivo) { return espera(ler().avaliacoes.filter(function (a) { return a.escola_id === escola && a.ano_letivo === anoLetivo; }).sort(function (a, b) { return String(b.criado_em).localeCompare(String(a.criado_em)); })); },
      salvar: function (a) { return mudar(function (b) {
        exigir(b, a.escola_id);
        if (a.id) { var x = b.avaliacoes.filter(function (y) { return y.id === a.id; })[0]; Object.assign(x, a); return x; }
        var n = Object.assign({ id: uid(), criado_em: new Date().toISOString() }, a); b.avaliacoes.push(n); return n;
      }); },
      apagar: function (id) { return mudar(function (b) { var a = b.avaliacoes.filter(function (x) { return x.id === id; })[0]; exigir(b, a.escola_id); b.avaliacoes = b.avaliacoes.filter(function (x) { return x.id !== id; }); b.respostas = b.respostas.filter(function (r) { return r.avaliacao_id !== id; }); }); }
    };
    D.respostas = {
      daAvaliacao: function (av) { return espera(ler().respostas.filter(function (r) { return r.avaliacao_id === av; }).map(function (r) { return { aluno_id: r.aluno_id, turma_id: r.turma_id, marcadas: r.marcadas }; })); },
      salvar: function (r) { return mudar(function (b) {
        if (!podeEscola(b, r.escola_id) && !douAula(b, r.turma_id)) throw new Error('Você não tem permissão para fazer isso.');
        b.respostas = b.respostas.filter(function (x) { return !(x.avaliacao_id === r.avaliacao_id && x.aluno_id === r.aluno_id); });
        b.respostas.push({ avaliacao_id: r.avaliacao_id, aluno_id: r.aluno_id, turma_id: r.turma_id, escola_id: r.escola_id, marcadas: r.marcadas });
      }); },
      apagar: function (av, aluno) { return mudar(function (b) {
        var r = b.respostas.filter(function (x) { return x.avaliacao_id === av && x.aluno_id === aluno; })[0];
        if (r && !podeEscola(b, r.escola_id) && !douAula(b, r.turma_id)) throw new Error('Você não tem permissão para fazer isso.');
        b.respostas = b.respostas.filter(function (x) { return !(x.avaliacao_id === av && x.aluno_id === aluno); });
      }); }
    };
    function inicioSemana(iso) { var d = new Date(iso + 'T12:00:00'); var w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return d.toISOString().slice(0, 10); }
    D.notas = {
      daAvaliacao: function (av) { return espera(ler().notas.filter(function (n) { return n.avaliacao_id === av; }).map(function (n) { return { aluno_id: n.aluno_id, turma_id: n.turma_id, valores: n.valores }; })); },
      salvarVarios: function (lista) { return mudar(function (b) {
        lista.forEach(function (n) {
          if (!podeEscola(b, n.escola_id) && !douAula(b, n.turma_id)) throw new Error('Você não tem permissão para fazer isso.');
          b.notas = b.notas.filter(function (x) { return !(x.avaliacao_id === n.avaliacao_id && x.aluno_id === n.aluno_id); });
          b.notas.push({ avaliacao_id: n.avaliacao_id, aluno_id: n.aluno_id, turma_id: n.turma_id, escola_id: n.escola_id, valores: n.valores });
        });
      }); },
      apagarTurma: function (av, turma) { return mudar(function (b) { b.notas = b.notas.filter(function (x) { return !(x.avaliacao_id === av && x.turma_id === turma); }); }); }
    };
    D.descImp = {
      listar: function (av) { return espera(ler().desc_importados.filter(function (d) { return d.avaliacao_id === av; }).map(function (d) { return { escopo: d.escopo, itens: d.itens }; })); },
      salvar: function (d) { return mudar(function (b) {
        if (!podeEscola(b, d.escola_id) && !(d.escopo !== 'serie' && douAula(b, d.escopo))) throw new Error('Você não tem permissão para fazer isso.');
        b.desc_importados = b.desc_importados.filter(function (x) { return !(x.avaliacao_id === d.avaliacao_id && x.escopo === d.escopo); });
        b.desc_importados.push({ avaliacao_id: d.avaliacao_id, escola_id: d.escola_id, escopo: d.escopo, itens: d.itens });
      }); }
    };
    D.horarios = {
      listar: function (escola) { return espera(ler().horarios.filter(function (h) { return h.escola_id === escola; }).sort(function (a, b) { return a.turno.localeCompare(b.turno) || a.aula - b.aula; })); },
      salvarTurno: function (escola, turno, lista) { return mudar(function (b) { exigir(b, escola); b.horarios = b.horarios.filter(function (h) { return !(h.escola_id === escola && h.turno === turno); }).concat(lista.map(function (h) { return { escola_id: escola, turno: turno, aula: h.aula, inicio: h.inicio || '', fim: h.fim || '' }; })); }); }
    };
    D.grade = {
      listar: function (escola) { return espera(ler().grade.filter(function (g) { return g.escola_id === escola; })); },
      salvar: function (g) { return mudar(function (b) {
        exigir(b, g.escola_id);
        b.grade = b.grade.filter(function (x) { return !(x.turma_id === g.turma_id && x.dia === g.dia && x.aula === g.aula); });
        if (g.componente || g.professor_id || g.professor_nome) b.grade.push({ id: uid(), escola_id: g.escola_id, turma_id: g.turma_id, dia: g.dia, aula: g.aula, componente: g.componente || '', professor_id: g.professor_id || null, professor_nome: g.professor_nome || '' });
      }); },
      salvarVarios: function (lista) { return mudar(function (b) {
        lista.forEach(function (g) {
          exigir(b, g.escola_id);
          b.grade = b.grade.filter(function (x) { return !(x.turma_id === g.turma_id && x.dia === g.dia && x.aula === g.aula); });
          b.grade.push({ id: uid(), escola_id: g.escola_id, turma_id: g.turma_id, dia: g.dia, aula: g.aula, componente: g.componente || '', professor_id: g.professor_id || null, professor_nome: g.professor_nome || '' });
        });
      }); }
    };
    D.apoios = {
      listar: function (escola, de, ate) { var b = ler(), c = eu(b), p = c && perfilDe(b, c.id), gest = podeEscola(b, escola);
        return espera(b.apoios.filter(function (a) { return a.escola_id === escola && a.status !== 'cancelado' && a.data >= de && a.data <= ate && (gest || (p && a.professor_id === p.id)); }).sort(function (a, b2) { return a.data.localeCompare(b2.data) || a.aula - b2.aula; })); },
      meus: function (perfil) { return espera(ler().apoios.filter(function (a) { return a.professor_id === perfil && a.status !== 'cancelado'; }).sort(function (a, b2) { return b2.data.localeCompare(a.data); })); },
      salvar: function (a) { return mudar(function (b) {
        exigir(b, a.escola_id);
        if (a.status !== 'cancelado') {
          var chave = a.professor_id || String(a.professor_nome || '').toLowerCase(), sem = inicioSemana(a.data);
          if (chave && b.apoios.some(function (x) { return x.id !== a.id && x.escola_id === a.escola_id && x.status !== 'cancelado' && (x.professor_id || String(x.professor_nome || '').toLowerCase()) === chave && inicioSemana(x.data) === sem; }))
            throw new Error('Este professor já tem um apoio agendado nesta semana. A regra é um apoio por semana para cada professor.');
        }
        if (a.id) { var x = b.apoios.filter(function (y) { return y.id === a.id; })[0]; Object.assign(x, a); return x; }
        var n = Object.assign({ id: uid(), status: 'agendado', devolutiva: {}, criado_em: new Date().toISOString() }, a); b.apoios.push(n); return n;
      }); }
    };
    D.flu = {
      cadernos: function (escola) { return espera(ler().flu_cadernos.filter(function (c) { return c.escola_id === escola; })); },
      salvarCaderno: function (c) { return mudar(function (b) {
        exigir(b, c.escola_id);
        if (b.flu_cadernos.some(function (x) { return x.id !== c.id && x.escola_id === c.escola_id && x.codigo === c.codigo; })) throw new Error('Já existe um caderno com este código.');
        if (c.id) { var x = b.flu_cadernos.filter(function (y) { return y.id === c.id; })[0]; Object.assign(x, c); return x; }
        var n = Object.assign({ id: uid() }, c); b.flu_cadernos.push(n); return n;
      }); },
      apagarCaderno: function (id) { return mudar(function (b) { var c = b.flu_cadernos.filter(function (x) { return x.id === id; })[0]; exigir(b, c.escola_id); b.flu_cadernos = b.flu_cadernos.filter(function (x) { return x.id !== id; }); }); },
      resultados: function (escola) { return espera(ler().flu_resultados.filter(function (r) { return r.escola_id === escola; }).sort(function (a, b2) { return String(b2.data).localeCompare(String(a.data)); })); },
      salvar: function (r) { return mudar(function (b) {
        if (!podeEscola(b, r.escola_id) && !douAula(b, r.turma_id)) throw new Error('Você não tem permissão para fazer isso.');
        b.flu_resultados.push(Object.assign({ id: uid(), data: new Date().toISOString() }, r));
      }); },
      apagar: function (id) { return mudar(function (b) { var r = b.flu_resultados.filter(function (x) { return x.id === id; })[0]; exigir(b, r.escola_id); b.flu_resultados = b.flu_resultados.filter(function (x) { return x.id !== id; }); }); }
    };
    D.reiniciarDemo = function () { try { localStorage.removeItem(CH); localStorage.removeItem(CS); } catch (e) {} };
    return D;
  }

  window.D = usarSupabase ? motorSupabase() : motorDemo();
})();
