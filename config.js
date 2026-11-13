// Configuração do Lume Escolas.
// Dados do projeto no Supabase (painel › Project Settings › API):
//   - URL do projeto
//   - chave "anon" / "public" (é pública por natureza; a segurança vem das regras do banco). NUNCA a service_role.
// Com os dois campos vazios o app abre no MODO DEMONSTRAÇÃO (dados de exemplo só no navegador).
// Para testar o modo demonstração com o banco configurado, abra o app com ?demo no endereço.
window.LUME_CONFIG = /[?&]demo\b/.test(location.search) ? {} : {
  supabaseUrl: 'https://mwbwmftqkkeslmzhdxuw.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13YndtZnRxa2tlc2xtemhkeHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDM5NjcsImV4cCI6MjExMDA3OTk2N30.E0CUo1h9Fignwn44MWzk26uigjxnXHgYEBOc3ex_6Os'
};
