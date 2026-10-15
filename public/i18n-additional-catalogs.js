'use strict';

// Explicit German and Brazilian Portuguese interface copy. Never applied to user content.
window.CyroAdditionalTranslations = (() => {
  const rows = [
["German","Deutsch","Alemão"],
["{voice} · Unavailable on this host","{voice} · Auf diesem Host nicht verfügbar","{voice} · Indisponível nesta hospedagem"],
["{voices} available voices across {languages} languages. Members can choose their own with /ttsvoice.","{voices} verfügbare Stimmen in {languages} Sprachen. Mitglieder können mit /ttsvoice ihre eigene auswählen.","{voices} vozes disponíveis em {languages} idiomas. Cada membro pode escolher a sua com /ttsvoice."],
["Some voices are unavailable on this host. Your saved default is kept until you choose another available voice.","Einige Stimmen sind auf diesem Host nicht verfügbar. Deine gespeicherte Standardstimme bleibt erhalten, bis du eine andere verfügbare Stimme auswählst.","Algumas vozes estão indisponíveis nesta hospedagem. Sua voz padrão será mantida até você escolher outra voz disponível."],
[" lets you search available voices by name or language. The numbered shortcuts "," lässt dich verfügbare Stimmen nach Name oder Sprache suchen. Die nummerierten Kurzbefehle "," permite buscar as vozes disponíveis por nome ou idioma. Os atalhos numerados "],
["TTS runs on Cyro’s host, with Daniel as the default. It reads new eligible messages only, without fetching chat history or sending text to a cloud voice service.","Die Sprachausgabe läuft auf Cyros Host, mit Daniel als Standardstimme. Sie liest nur neue zulässige Nachrichten vor, ohne den Chatverlauf abzurufen oder Text an einen Sprachdienst in der Cloud zu senden.","A leitura de mensagens roda na hospedagem do Cyro, com Daniel como voz padrão. Ela lê apenas novas mensagens permitidas, sem buscar o histórico do chat nem enviar o texto a um serviço de voz na nuvem."],
["Free local voices cover English, French, Spanish, German, Brazilian Portuguese, Italian and Hindi when their host runtimes are installed. Search /ttsvoice by voice name or language. Speech reads the original text; it does not translate it. Each server uses one voice channel and one mode at a time.","Kostenlose lokale Stimmen unterstützen Englisch, Französisch, Spanisch, Deutsch, brasilianisches Portugiesisch, Italienisch und Hindi, wenn die entsprechenden Sprachmodule installiert sind. Suche mit /ttsvoice nach Name oder Sprache. Die Sprachausgabe liest den Originaltext vor und übersetzt ihn nicht. Pro Server sind ein Sprachkanal und ein Modus gleichzeitig möglich.","As vozes locais gratuitas oferecem inglês, francês, espanhol, alemão, português do Brasil, italiano e hindi quando os respectivos mecanismos estão instalados. Busque por nome ou idioma com /ttsvoice. A leitura usa o texto original, sem traduzi-lo. Cada servidor usa um canal de voz e um modo por vez."],
  [
    "Voice language",
    "Sprache der Stimme",
    "Idioma da voz"
  ],
  [
    "English",
    "Englisch",
    "Inglês"
  ],
  [
    "French",
    "Französisch",
    "Francês"
  ],
  [
    "Spanish",
    "Spanisch",
    "Espanhol"
  ],
  [
    "Italian",
    "Italienisch",
    "Italiano"
  ],
  [
    "Brazilian Portuguese",
    "Brasilianisches Portugiesisch",
    "Português do Brasil"
  ],
  [
    "Hindi",
    "Hindi",
    "Hindi"
  ],
  [
    "Language chooses how text is pronounced; it does not translate messages.",
    "Die Sprache bestimmt die Aussprache; Nachrichten werden nicht übersetzt.",
    "O idioma define a pronúncia do texto; ele não traduz as mensagens."
  ],
  [
    "25 voices across six languages. Members can choose their own with /ttsvoice.",
    "25 Stimmen in sechs Sprachen. Mitglieder wählen ihre Stimme mit /ttsvoice.",
    "25 vozes em seis idiomas. Cada membro pode escolher a sua com /ttsvoice."
  ],
  [
    "Male voices",
    "Männliche Stimmen",
    "Vozes masculinas"
  ],
  [
    "Female voices",
    "Weibliche Stimmen",
    "Vozes femininas"
  ],
  [
    "Default voice",
    "Standardstimme",
    "Voz padrão"
  ],
  [
    "No voices available",
    "Keine Stimmen verfügbar",
    "Nenhuma voz disponível"
  ],
  [
    "Give your voice channels a soundtrack, or let members join the conversation through text.",
    "Spiele Musik in Sprachkanälen ab oder lass Mitglieder per Text am Gespräch teilnehmen.",
    "Coloque música nos canais de voz ou permita que os membros participem da conversa por texto."
  ],
  [
    "Loading voice settings…",
    "Spracheinstellungen werden geladen…",
    "Carregando configurações de voz…"
  ],
  [
    "Voice settings unavailable",
    "Spracheinstellungen nicht verfügbar",
    "Configurações de voz indisponíveis"
  ],
  [
    "Music playback",
    "Musikwiedergabe",
    "Reprodução de música"
  ],
  [
    "Enable music",
    "Musik aktivieren",
    "Ativar música"
  ],
  [
    "Members can add supported audio links to the queue in their current voice channel.",
    "Mitglieder können unterstützte Audiolinks zur Warteschlange ihres Sprachkanals hinzufügen.",
    "Os membros podem adicionar links de áudio compatíveis à fila do canal de voz em que estão."
  ],
  [
    "Playback volume (%)",
    "Wiedergabelautstärke (%)",
    "Volume de reprodução (%)"
  ],
  [
    "The server’s playback volume. Start low so people can still hear one another.",
    "Die Wiedergabelautstärke des Servers. Beginne leise, damit sich alle noch verstehen.",
    "O volume de reprodução do servidor. Comece baixo para que as pessoas ainda consigam se ouvir."
  ],
  [
    "Maximum time per track (minutes)",
    "Maximale Titellänge (Minuten)",
    "Duração máxima por faixa (minutos)"
  ],
  [
    "Between 1 and 30 minutes. Radio streams also stop at this limit so the queue can move on.",
    "Zwischen 1 und 30 Minuten. Auch Radiostreams enden nach dieser Zeit, damit die Warteschlange weiterläuft.",
    "Entre 1 e 30 minutos. As rádios também param nesse limite para que a fila continue."
  ],
  [
    "Text to speech",
    "Sprachausgabe",
    "Texto para voz"
  ],
  [
    "Enable text to speech",
    "Sprachausgabe aktivieren",
    "Ativar texto para voz"
  ],
  [
    "Read new messages from the active voice channel’s text chat, when their author is also in that call.",
    "Neue Nachrichten im Textchat des aktiven Sprachkanals vorlesen, wenn ihr Verfasser ebenfalls im Anruf ist.",
    "Ler as novas mensagens do chat do canal de voz ativo quando o autor também estiver na chamada."
  ],
  [
    "Say the speaker’s name",
    "Namen des Verfassers vorlesen",
    "Dizer o nome de quem enviou"
  ],
  [
    "Add the member’s server display name before each new message, for example: “Frosty said: Hello everyone.” Turn this off to read only their message.",
    "Den Server-Anzeigenamen vor jeder neuen Nachricht vorlesen, zum Beispiel: „Frosty sagt: Hallo zusammen.“ Ausschalten, um nur die Nachricht vorzulesen.",
    "Dizer o nome de exibição do membro antes de cada mensagem, por exemplo: “Frosty disse: Olá, pessoal.” Desative para ler apenas a mensagem."
  ],
  [
    "Open this page or refresh to see the current voice session.",
    "Öffne diese Seite oder aktualisiere sie, um die aktuelle Sprachsitzung zu sehen.",
    "Abra esta página ou atualize para ver a sessão de voz atual."
  ],
  [
    "Refresh session",
    "Sitzung aktualisieren",
    "Atualizar sessão"
  ],
  [
    "Refreshing…",
    "Wird aktualisiert…",
    "Atualizando…"
  ],
  [
    "Reading chat",
    "Chat wird vorgelesen",
    "Lendo o chat"
  ],
  [
    "Music session",
    "Musiksitzung",
    "Sessão de música"
  ],
  [
    "Connected to a voice channel",
    "Mit einem Sprachkanal verbunden",
    "Conectado a um canal de voz"
  ],
  [
    "New eligible messages in this call’s chat are read aloud.",
    "Neue geeignete Nachrichten im Chat dieses Anrufs werden vorgelesen.",
    "As novas mensagens elegíveis do chat desta chamada são lidas em voz alta."
  ],
  [
    "Waiting for a track.",
    "Warten auf einen Titel.",
    "Aguardando uma faixa."
  ],
  [
    "No active voice session",
    "Keine aktive Sprachsitzung",
    "Nenhuma sessão de voz ativa"
  ],
  [
    "Join a voice channel in Discord, then use /playmusic or /addtts to bring Cyro in.",
    "Tritt einem Sprachkanal in Discord bei und hole Cyro mit /playmusic oder /addtts dazu.",
    "Entre em um canal de voz no Discord e use /playmusic ou /addtts para trazer o Cyro."
  ],
  [
    "Saving voice settings…",
    "Spracheinstellungen werden gespeichert…",
    "Salvando configurações de voz…"
  ],
  [
    "Voice settings saved.",
    "Spracheinstellungen gespeichert.",
    "Configurações de voz salvas."
  ],
  [
    "Demo voice settings saved.",
    "Demo-Spracheinstellungen gespeichert.",
    "Configurações de voz da demonstração salvas."
  ],
  [
    "Bring Cyro into a call",
    "Cyro in einen Anruf holen",
    "Trazer o Cyro para uma chamada"
  ],
  [
    "Join a normal voice channel first. Commands use the call you are in, even when sent from another text channel.",
    "Tritt zuerst einem normalen Sprachkanal bei. Befehle verwenden deinen aktuellen Anruf, auch wenn du sie aus einem anderen Textkanal sendest.",
    "Primeiro entre em um canal de voz normal. Os comandos usam a chamada em que você está, mesmo quando enviados de outro canal de texto."
  ],
  [
    "Current voice session",
    "Aktuelle Sprachsitzung",
    "Sessão de voz atual"
  ],
  [
    "Supported music links",
    "Unterstützte Musiklinks",
    "Links de música compatíveis"
  ],
  [
    "One call at a time",
    "Ein Anruf zur selben Zeit",
    "Uma chamada por vez"
  ],
  [
    " offers voices in six languages. The numbered shortcuts ",
    " bietet Stimmen in sechs Sprachen. Die nummerierten Kurzbefehle ",
    " oferece vozes em seis idiomas. Os atalhos numerados "
  ],
  [
    " through ",
    " bis ",
    " até "
  ],
  [
    " keep the twelve English voices.",
    " behalten die zwölf englischen Stimmen.",
    " mantêm as doze vozes em inglês."
  ],
  [
    "Dashboard language",
    "Dashboard-Sprache",
    "Idioma do painel"
  ],
  [
    "Your language changes this browser only. Saved messages and server settings are not translated.",
    "Diese Sprachwahl gilt nur für diesen Browser. Gespeicherte Nachrichten und Servereinstellungen werden nicht übersetzt.",
    "A sua escolha de idioma vale apenas para este navegador. As mensagens salvas e as configurações do servidor não são traduzidas."
  ],
  [
    "Some dashboard pages still use English. Bot messages use your server’s selected language.",
    "Einige Dashboard-Seiten sind noch auf Englisch. Bot-Nachrichten verwenden die gewählte Serversprache.",
    "Algumas páginas do painel ainda usam inglês. As mensagens do bot usam o idioma escolhido para o servidor."
  ],
  [
    "Server language",
    "Serversprache",
    "Idioma do servidor"
  ],
  [
    "Choose the language for bot messages. This is separate from your dashboard language and each member’s TTS voice.",
    "Wähle die Sprache für Bot-Nachrichten. Sie ist unabhängig von deiner Dashboard-Sprache und der TTS-Stimme jedes Mitglieds.",
    "Escolha o idioma das mensagens do bot. Ele é independente do idioma do painel e da voz TTS de cada membro."
  ],
  [
    "Automatic · Discord language",
    "Automatisch · Discord-Sprache",
    "Automático · Idioma do Discord"
  ],
  [
    "Save server language",
    "Serversprache speichern",
    "Salvar idioma do servidor"
  ],
  [
    "Server language saved.",
    "Serversprache gespeichert.",
    "Idioma do servidor salvo."
  ],
  [
    "Automatic uses Discord’s language for supported interaction replies. Shared announcements keep the server default.",
    "Automatisch verwendet die Discord-Sprache für unterstützte Interaktionsantworten. Gemeinsame Ankündigungen behalten die Standardsprache des Servers.",
    "O modo automático usa o idioma do Discord nas respostas a interações compatíveis. Os anúncios compartilhados mantêm o idioma padrão do servidor."
  ],
  [
    "Overview",
    "Übersicht",
    "Visão geral"
  ],
  [
    "Getting started",
    "Erste Schritte",
    "Primeiros passos"
  ],
  [
    "Creators & alerts",
    "Creator & Benachrichtigungen",
    "Criadores e alertas"
  ],
  [
    "Streamer leaderboard",
    "Streamer-Rangliste",
    "Ranking de streamers"
  ],
  [
    "Counting",
    "Zählspiel",
    "Contagem"
  ],
  [
    "Suggestions",
    "Vorschläge",
    "Sugestões"
  ],
  [
    "Polls",
    "Umfragen",
    "Enquetes"
  ],
  [
    "Anonymous confessions",
    "Anonyme Geständnisse",
    "Confissões anônimas"
  ],
  [
    "Music & TTS",
    "Musik & TTS",
    "Música e TTS"
  ],
  [
    "Temporary voice",
    "Temporäre Sprachkanäle",
    "Salas de voz temporárias"
  ],
  [
    "Welcome & roles",
    "Begrüßung & Rollen",
    "Boas-vindas e cargos"
  ],
  [
    "Status roles",
    "Statusrollen",
    "Cargos por status"
  ],
  [
    "Verification",
    "Verifizierung",
    "Verificação"
  ],
  [
    "Invites & levels",
    "Einladungen & Level",
    "Convites e níveis"
  ],
  [
    "Moderation",
    "Moderation",
    "Moderação"
  ],
  [
    "Bot appearance",
    "Bot-Erscheinungsbild",
    "Aparência do bot"
  ],
  [
    "Support tickets",
    "Support-Tickets",
    "Tickets de suporte"
  ],
  [
    "Applications",
    "Bewerbungen",
    "Candidaturas"
  ],
  [
    "Bug reports",
    "Fehlermeldungen",
    "Relatos de bugs"
  ],
  [
    "Staff leaderboard",
    "Team-Rangliste",
    "Ranking da equipe"
  ],
  [
    "Channel messages",
    "Kanalnachrichten",
    "Mensagens de canal"
  ],
  [
    "Sticky messages",
    "Wiederkehrende Nachrichten",
    "Mensagens fixas recorrentes"
  ],
  [
    "Access & commands",
    "Zugriff & Befehle",
    "Acesso e comandos"
  ],
  [
    "Workspace",
    "Arbeitsbereich",
    "Área de trabalho"
  ],
  [
    "Creators",
    "Creator",
    "Criadores"
  ],
  [
    "Community",
    "Community",
    "Comunidade"
  ],
  [
    "Server management",
    "Serververwaltung",
    "Gerenciamento do servidor"
  ],
  [
    "Your server",
    "Dein Server",
    "Seu servidor"
  ],
  [
    "Your servers",
    "Deine Server",
    "Seus servidores"
  ],
  [
    "Your account",
    "Dein Konto",
    "Sua conta"
  ],
  [
    "Community settings",
    "Community-Einstellungen",
    "Configurações da comunidade"
  ],
  [
    "Server navigation",
    "Servernavigation",
    "Navegação do servidor"
  ],
  [
    "Toggle navigation",
    "Navigation ein-/ausblenden",
    "Mostrar ou ocultar navegação"
  ],
  [
    "Close navigation",
    "Navigation schließen",
    "Fechar navegação"
  ],
  [
    "Add to another server",
    "Zu einem weiteren Server hinzufügen",
    "Adicionar a outro servidor"
  ],
  [
    "Community & support",
    "Community & Support",
    "Comunidade e suporte"
  ],
  [
    "Creator and legal links",
    "Creator- und rechtliche Links",
    "Links para criadores e informações legais"
  ],
  [
    "About Cyro",
    "Über Cyro",
    "Sobre o Cyro"
  ],
  [
    "My connections",
    "Meine Verbindungen",
    "Minhas conexões"
  ],
  [
    "Privacy",
    "Datenschutz",
    "Privacidade"
  ],
  [
    "Terms",
    "Nutzungsbedingungen",
    "Termos"
  ],
  [
    "Demo session",
    "Demo-Sitzung",
    "Sessão de demonstração"
  ],
  [
    "Connected to Discord",
    "Mit Discord verbunden",
    "Conectado ao Discord"
  ],
  [
    "Sign out",
    "Abmelden",
    "Sair"
  ],
  [
    "Demo workspace",
    "Demo-Arbeitsbereich",
    "Área de demonstração"
  ],
  [
    "Sample data. Changes stay in this browser session.",
    "Beispieldaten. Änderungen bleiben in dieser Browsersitzung.",
    "Dados de exemplo. As alterações ficam nesta sessão do navegador."
  ],
  [
    "Exit demo",
    "Demo verlassen",
    "Sair da demonstração"
  ],
  [
    "Loading server settings…",
    "Servereinstellungen werden geladen…",
    "Carregando configurações do servidor…"
  ],
  [
    "Loading settings…",
    "Einstellungen werden geladen…",
    "Carregando configurações…"
  ],
  [
    "Settings unavailable",
    "Einstellungen nicht verfügbar",
    "Configurações indisponíveis"
  ],
  [
    "Could not load this server.",
    "Dieser Server konnte nicht geladen werden.",
    "Não foi possível carregar este servidor."
  ],
  [
    "Try again",
    "Erneut versuchen",
    "Tentar novamente"
  ],
  [
    "Enabled",
    "Aktiviert",
    "Ativado"
  ],
  [
    "Disabled",
    "Deaktiviert",
    "Desativado"
  ],
  [
    "Not set up",
    "Nicht eingerichtet",
    "Não configurado"
  ],
  [
    "Save changes",
    "Änderungen speichern",
    "Salvar alterações"
  ],
  [
    "Saving…",
    "Wird gespeichert…",
    "Salvando…"
  ],
  [
    "Saving your settings…",
    "Einstellungen werden gespeichert…",
    "Salvando suas configurações…"
  ],
  [
    "Your settings are up to date.",
    "Deine Einstellungen sind aktuell.",
    "Suas configurações estão atualizadas."
  ],
  [
    "You have unsaved changes.",
    "Du hast ungespeicherte Änderungen.",
    "Você tem alterações não salvas."
  ],
  [
    "You have unsaved settings.",
    "Du hast ungespeicherte Einstellungen.",
    "Você tem configurações não salvas."
  ],
  [
    "Saved for this demo session.",
    "Für diese Demo-Sitzung gespeichert.",
    "Salvo para esta sessão de demonstração."
  ],
  [
    "Saved for this demo session. Discord was not changed.",
    "Für diese Demo-Sitzung gespeichert. Discord wurde nicht geändert.",
    "Salvo para esta sessão de demonstração. O Discord não foi alterado."
  ],
  [
    "Changes saved. Your server is up to date.",
    "Änderungen gespeichert. Dein Server ist aktuell.",
    "Alterações salvas. Seu servidor está atualizado."
  ],
  [
    "Demo settings saved in this session.",
    "Demo-Einstellungen in dieser Sitzung gespeichert.",
    "Configurações de demonstração salvas nesta sessão."
  ],
  [
    "Demo settings saved.",
    "Demo-Einstellungen gespeichert.",
    "Configurações de demonstração salvas."
  ],
  [
    "Server settings saved.",
    "Servereinstellungen gespeichert.",
    "Configurações do servidor salvas."
  ],
  [
    "Please wait for your settings to finish saving.",
    "Bitte warte, bis deine Einstellungen gespeichert sind.",
    "Aguarde a conclusão do salvamento das configurações."
  ],
  [
    "Leave your unsaved changes?",
    "Ungespeicherte Änderungen verlassen?",
    "Sair com alterações não salvas?"
  ],
  [
    "Your changes have not been saved. Switching servers will discard them.",
    "Deine Änderungen wurden nicht gespeichert. Beim Serverwechsel gehen sie verloren.",
    "Suas alterações não foram salvas. Elas serão descartadas ao trocar de servidor."
  ],
  [
    "You can save your settings before opening another page.",
    "Du kannst deine Einstellungen speichern, bevor du eine andere Seite öffnest.",
    "Você pode salvar suas configurações antes de abrir outra página."
  ],
  [
    "Sign out without saving?",
    "Ohne Speichern abmelden?",
    "Sair sem salvar?"
  ],
  [
    "Your unsaved changes will be discarded.",
    "Deine ungespeicherten Änderungen gehen verloren.",
    "Suas alterações não salvas serão descartadas."
  ],
  [
    "Discard changes",
    "Änderungen verwerfen",
    "Descartar alterações"
  ],
  [
    "Keep editing",
    "Weiter bearbeiten",
    "Continuar editando"
  ],
  [
    "Cancel",
    "Abbrechen",
    "Cancelar"
  ],
  [
    "Confirm",
    "Bestätigen",
    "Confirmar"
  ],
  [
    "Remove",
    "Entfernen",
    "Remover"
  ],
  [
    "Edit",
    "Bearbeiten",
    "Editar"
  ],
  [
    "Configure",
    "Konfigurieren",
    "Configurar"
  ],
  [
    "Set up",
    "Einrichten",
    "Configurar"
  ],
  [
    "Refresh",
    "Aktualisieren",
    "Atualizar"
  ],
  [
    "Done",
    "Fertig",
    "Concluído"
  ],
  [
    "Next",
    "Weiter",
    "Próximo"
  ],
  [
    "Previous",
    "Zurück",
    "Anterior"
  ],
  [
    "Open",
    "Offen",
    "Aberto"
  ],
  [
    "Closed",
    "Geschlossen",
    "Fechado"
  ],
  [
    "Closing",
    "Wird geschlossen",
    "Fechando"
  ],
  [
    "Locked",
    "Gesperrt",
    "Trancado"
  ],
  [
    "Pending",
    "Ausstehend",
    "Pendente"
  ],
  [
    "In progress",
    "In Bearbeitung",
    "Em andamento"
  ],
  [
    "Resolved",
    "Behoben",
    "Resolvido"
  ],
  [
    "Dismissed",
    "Verworfen",
    "Descartado"
  ],
  [
    "Status",
    "Status",
    "Status"
  ],
  [
    "No role",
    "Keine Rolle",
    "Nenhum cargo"
  ],
  [
    "No channel selected",
    "Kein Kanal ausgewählt",
    "Nenhum canal selecionado"
  ],
  [
    "Select a category",
    "Kategorie auswählen",
    "Selecionar uma categoria"
  ],
  [
    "Select a channel",
    "Kanal auswählen",
    "Selecionar um canal"
  ],
  [
    "Select roles",
    "Rollen auswählen",
    "Selecionar cargos"
  ],
  [
    "None selected",
    "Nichts ausgewählt",
    "Nada selecionado"
  ],
  [
    "Search servers…",
    "Server suchen…",
    "Buscar servidores…"
  ],
  [
    "Search channels…",
    "Kanäle suchen…",
    "Buscar canais…"
  ],
  [
    "Search roles…",
    "Rollen suchen…",
    "Buscar cargos…"
  ],
  [
    "Search categories…",
    "Kategorien suchen…",
    "Buscar categorias…"
  ],
  [
    "Search options…",
    "Optionen suchen…",
    "Buscar opções…"
  ],
  [
    "Select servers",
    "Server auswählen",
    "Selecionar servidores"
  ],
  [
    "Select channels",
    "Kanäle auswählen",
    "Selecionar canais"
  ],
  [
    "Select categories",
    "Kategorien auswählen",
    "Selecionar categorias"
  ],
  [
    "Select options",
    "Optionen auswählen",
    "Selecionar opções"
  ],
  [
    "No results. Try another name or ID.",
    "Keine Ergebnisse. Versuche einen anderen Namen oder eine andere ID.",
    "Nenhum resultado. Tente outro nome ou ID."
  ],
  [
    "{count} selected · Select again to remove",
    "{count} ausgewählt · Zum Entfernen erneut auswählen",
    "{count} selecionados · Selecione novamente para remover"
  ],
  [
    "{count} options",
    "{count} Optionen",
    "{count} opções"
  ],
  [
    "Search {label}",
    "{label} suchen",
    "Buscar {label}"
  ],
  [
    "{label}: {selection}",
    "{label}: {selection}",
    "{label}: {selection}"
  ],
  [
    " Search and select as many roles as you need.",
    " Suche und wähle so viele Rollen aus, wie du brauchst.",
    " Busque e selecione quantos cargos precisar."
  ],
  [
    "Server overview. Keep up with your community and manage its tools.",
    "Serverübersicht. Behalte deine Community im Blick und verwalte ihre Werkzeuge.",
    "Visão geral do servidor. Acompanhe sua comunidade e gerencie suas ferramentas."
  ],
  [
    "How to use Cyro",
    "So verwendest du Cyro",
    "Como usar o Cyro"
  ],
  [
    "Community members",
    "Community-Mitglieder",
    "Membros da comunidade"
  ],
  [
    "Members in this server",
    "Mitglieder dieses Servers",
    "Membros deste servidor"
  ],
  [
    "Stream alerts",
    "Stream-Benachrichtigungen",
    "Alertas de transmissão"
  ],
  [
    "{p0} accounts live right now",
    "{p0} Konten sind gerade live",
    "{p0} contas ao vivo agora"
  ],
  [
    "Community count",
    "Community-Zähler",
    "Contagem da comunidade"
  ],
  [
    "Personal best: {p0}",
    "Persönlicher Rekord: {p0}",
    "Recorde pessoal: {p0}"
  ],
  [
    "Open tickets",
    "Offene Tickets",
    "Tickets abertos"
  ],
  [
    "Waiting for your team",
    "Warten auf dein Team",
    "Aguardando sua equipe"
  ],
  [
    "No open conversations",
    "Keine offenen Gespräche",
    "Nenhuma conversa aberta"
  ],
  [
    "Community counting",
    "Gemeinsam zählen",
    "Contagem em comunidade"
  ],
  [
    "Counting channel",
    "Zählkanal",
    "Canal de contagem"
  ],
  [
    "Set a channel and let your members build something together.",
    "Wähle einen Kanal, in dem deine Mitglieder gemeinsam etwas aufbauen können.",
    "Escolha um canal para seus membros construírem algo juntos."
  ],
  [
    "Someone's next move is {p0}. Keep it going together.",
    "Die nächste Zahl ist {p0}. Macht gemeinsam weiter.",
    "O próximo número é {p0}. Continuem juntos."
  ],
  [
    "CURRENT STREAK",
    "AKTUELLE SERIE",
    "SEQUÊNCIA ATUAL"
  ],
  [
    "BEST · {p0}",
    "REKORD · {p0}",
    "RECORDE · {p0}"
  ],
  [
    "Creator watchlist",
    "Beobachtete Creator",
    "Criadores acompanhados"
  ],
  [
    "Live off",
    "Live-Meldungen aus",
    "Alertas de live desativados"
  ],
  [
    "Live now",
    "Jetzt live",
    "Ao vivo agora"
  ],
  [
    "Watching",
    "Wird beobachtet",
    "Em acompanhamento"
  ],
  [
    "Manage alerts",
    "Benachrichtigungen verwalten",
    "Gerenciar alertas"
  ],
  [
    "Manage creators",
    "Creator verwalten",
    "Gerenciar criadores"
  ],
  [
    "Add a streamer",
    "Streamer hinzufügen",
    "Adicionar streamer"
  ],
  [
    "Server modules",
    "Servermodule",
    "Módulos do servidor"
  ],
  [
    "Recent activity",
    "Letzte Aktivitäten",
    "Atividade recente"
  ],
  [
    "View activity",
    "Aktivität ansehen",
    "Ver atividade"
  ],
  [
    "Invites",
    "Einladungen",
    "Convites"
  ],
  [
    "Filters, warnings & your mod log",
    "Filter, Verwarnungen & Moderationsprotokoll",
    "Filtros, avisos e registro de moderação"
  ],
  [
    "Greetings and automatic roles",
    "Begrüßungen und automatische Rollen",
    "Boas-vindas e cargos automáticos"
  ],
  [
    "A reward for showing your community",
    "Eine Belohnung fürs Repräsentieren deiner Community",
    "Uma recompensa por representar sua comunidade"
  ],
  [
    "Audio queues and a voice for your chat",
    "Audiowarteschlangen und eine Stimme für deinen Chat",
    "Filas de áudio e uma voz para o seu chat"
  ],
  [
    "A space to share without a name",
    "Ein Ort zum anonymen Teilen",
    "Um espaço para compartilhar sem se identificar"
  ],
  [
    "Logs and community challenges",
    "Protokolle und Community-Challenges",
    "Registros e desafios da comunidade"
  ],
  [
    "Staff invite history and join sources",
    "Einladungsverlauf und Beitrittsquellen für das Team",
    "Histórico de convites e origens das entradas para a equipe"
  ],
  [
    "Support channels your way",
    "Supportkanäle nach deinen Vorstellungen",
    "Canais de suporte do seu jeito"
  ],
  [
    "Staff and role applications",
    "Team- und Rollenbewerbungen",
    "Candidaturas para equipe e cargos"
  ],
  [
    "Temporary voice rooms",
    "Temporäre Sprachräume",
    "Salas de voz temporárias"
  ],
  [
    "Let members make a room by joining a voice lobby. Cyro closes it when everyone leaves.",
    "Mitglieder erstellen einen Raum, indem sie einer Sprachlobby beitreten. Cyro schließt ihn, wenn alle gegangen sind.",
    "Os membros criam uma sala ao entrar no canal de acesso de voz. O Cyro a fecha quando todos saem."
  ],
  [
    "Loading temporary rooms…",
    "Temporäre Räume werden geladen…",
    "Carregando salas temporárias…"
  ],
  [
    "Could not load temporary rooms",
    "Temporäre Räume konnten nicht geladen werden",
    "Não foi possível carregar as salas temporárias"
  ],
  [
    "Join to create",
    "Beitreten zum Erstellen",
    "Entrar para criar"
  ],
  [
    "Enable temporary rooms",
    "Temporäre Räume aktivieren",
    "Ativar salas temporárias"
  ],
  [
    "Members join your lobby and move into their own room. Turning this off stops new rooms; existing rooms still close when empty.",
    "Mitglieder treten der Lobby bei und werden in ihren eigenen Raum verschoben. Ausschalten verhindert neue Räume; bestehende Räume schließen weiterhin, sobald sie leer sind.",
    "Os membros entram no canal de acesso e são movidos para sua própria sala. Desativar impede novas salas; as existentes continuam sendo fechadas quando ficam vazias."
  ],
  [
    "Join-to-create channel",
    "Kanal zum Erstellen von Räumen",
    "Canal de entrada para criar"
  ],
  [
    "Create a normal voice channel in Discord first, such as “Join to create”. Do not use a temporary room as the lobby.",
    "Erstelle zuerst einen normalen Sprachkanal in Discord, zum Beispiel „Beitreten zum Erstellen“. Verwende keinen temporären Raum als Lobby.",
    "Primeiro crie um canal de voz normal no Discord, como “Entrar para criar”. Não use uma sala temporária como canal de acesso."
  ],
  [
    "Select a voice lobby",
    "Sprachlobby auswählen",
    "Selecionar canal de acesso de voz"
  ],
  [
    "Room category",
    "Raumkategorie",
    "Categoria das salas"
  ],
  [
    "New rooms inherit this category’s visibility. Members need View Channel and Connect here as well as in the lobby.",
    "Neue Räume übernehmen die Sichtbarkeit dieser Kategorie. Mitglieder brauchen hier und in der Lobby die Rechte „Kanal ansehen“ und „Verbinden“.",
    "As novas salas herdam a visibilidade desta categoria. Os membros precisam de Ver canal e Conectar aqui e no canal de acesso."
  ],
  [
    "Room name",
    "Raumname",
    "Nome da sala"
  ],
  [
    "Use {name} for the member’s server display name, for example “{name}’s room”.",
    "Verwende {name} für den Anzeigenamen des Mitglieds auf dem Server, zum Beispiel „Raum von {name}“.",
    "Use {name} para o nome de exibição do membro no servidor, por exemplo “Sala de {name}”."
  ],
  [
    "Default member limit",
    "Standard-Mitgliederlimit",
    "Limite padrão de membros"
  ],
  [
    "0 means no limit. Room owners can change this with the Member limit button in their room’s chat.",
    "0 bedeutet unbegrenzt. Raumbesitzer können das Limit mit der Schaltfläche „Mitgliederlimit“ im Raumchat ändern.",
    "0 significa sem limite. Os donos das salas podem alterar isso com o botão de limite de membros no chat da sala."
  ],
  [
    "Maximum active rooms",
    "Maximal aktive Räume",
    "Máximo de salas ativas"
  ],
  [
    "Between 1 and 25 rooms per server. A member can own one room at a time.",
    "Zwischen 1 und 25 Räume pro Server. Ein Mitglied kann jeweils einen Raum besitzen.",
    "Entre 1 e 25 salas por servidor. Cada membro pode ter uma sala por vez."
  ],
  [
    "Room controls",
    "Raumsteuerung",
    "Controles da sala"
  ],
  [
    "Let owners manage their room",
    "Besitzern die Raumverwaltung erlauben",
    "Permitir que os donos gerenciem suas salas"
  ],
  [
    "Each room gets Lock, Unlock, Rename, Member limit, Allow member and Remove member buttons in its text chat. Staff with Manage Channels can manage a room they have joined.",
    "Jeder Raum erhält im Textchat Schaltflächen zum Sperren, Entsperren, Umbenennen, Begrenzen, Zulassen und Entfernen von Mitgliedern. Teammitglieder mit „Kanäle verwalten“ können einen Raum verwalten, dem sie beigetreten sind.",
    "Cada sala recebe botões para trancar, destrancar, renomear, limitar, permitir e remover membros no chat de texto. A equipe com Gerenciar canais pode administrar uma sala da qual participa."
  ],
  [
    "Refresh rooms",
    "Räume aktualisieren",
    "Atualizar salas"
  ],
  [
    "Room activity refreshes when you open this page or choose Refresh rooms.",
    "Die Raumaktivität wird beim Öffnen dieser Seite oder über „Räume aktualisieren“ aktualisiert.",
    "A atividade das salas é atualizada ao abrir esta página ou escolher Atualizar salas."
  ],
  [
    "No temporary rooms open",
    "Keine temporären Räume geöffnet",
    "Nenhuma sala temporária aberta"
  ],
  [
    "Once enabled, join your lobby in Discord to create the first room.",
    "Tritt nach dem Aktivieren der Lobby in Discord bei, um den ersten Raum zu erstellen.",
    "Depois de ativar, entre no canal de acesso no Discord para criar a primeira sala."
  ],
  [
    "Owner ID: {p0}",
    "Besitzer-ID: {p0}",
    "ID do dono: {p0}"
  ],
  [
    "Room activity refreshed. Your settings draft has been kept.",
    "Raumaktivität aktualisiert. Deine ungespeicherten Einstellungen bleiben erhalten.",
    "Atividade das salas atualizada. Suas configurações não salvas foram mantidas."
  ],
  [
    "Choose a voice lobby and a room category before enabling temporary rooms.",
    "Wähle eine Sprachlobby und eine Raumkategorie, bevor du temporäre Räume aktivierst.",
    "Escolha um canal de acesso de voz e uma categoria antes de ativar as salas temporárias."
  ],
  [
    "Saving temporary room settings…",
    "Einstellungen für temporäre Räume werden gespeichert…",
    "Salvando configurações das salas temporárias…"
  ],
  [
    "Temporary room settings saved.",
    "Einstellungen für temporäre Räume gespeichert.",
    "Configurações das salas temporárias salvas."
  ],
  [
    "How members use rooms",
    "So verwenden Mitglieder Räume",
    "Como os membros usam as salas"
  ],
  [
    "Lock",
    "Sperren",
    "Trancar"
  ],
  [
    "Unlock",
    "Entsperren",
    "Destrancar"
  ],
  [
    "Rename",
    "Umbenennen",
    "Renomear"
  ],
  [
    "Member limit",
    "Mitgliederlimit",
    "Limite de membros"
  ],
  [
    "Allow member",
    "Mitglied zulassen",
    "Permitir membro"
  ],
  [
    "Remove member",
    "Mitglied entfernen",
    "Remover membro"
  ],
  [
    "Open rooms",
    "Offene Räume",
    "Salas abertas"
  ],
  [
    "Before you enable it",
    "Vor dem Aktivieren",
    "Antes de ativar"
  ],
  [
    "Give members a clear place to report problems, and keep track of the fix.",
    "Gib Mitgliedern einen klaren Ort für Problemmeldungen und verfolge deren Behebung.",
    "Ofereça aos membros um lugar claro para relatar problemas e acompanhar a correção."
  ],
  [
    "Keep the useful information close to the latest conversation.",
    "Halte nützliche Informationen in der Nähe der neuesten Unterhaltung.",
    "Mantenha as informações úteis perto das mensagens mais recentes."
  ],
  [
    "Add a category",
    "Kategorie hinzufügen",
    "Adicionar categoria"
  ],
  [
    "Add a sticky message",
    "Wiederkehrende Nachricht hinzufügen",
    "Adicionar mensagem fixa recorrente"
  ],
  [
    "Report history",
    "Meldungsverlauf",
    "Histórico de relatos"
  ],
  [
    "Report status",
    "Meldungsstatus",
    "Status do relato"
  ],
  [
    "Search this page",
    "Diese Seite durchsuchen",
    "Buscar nesta página"
  ],
  [
    "Refresh reports",
    "Meldungen aktualisieren",
    "Atualizar relatos"
  ],
  [
    "No reports to show",
    "Keine Meldungen vorhanden",
    "Nenhum relato para mostrar"
  ],
  [
    "When a member submits /bugreport, it appears here and in its category’s channel.",
    "Wenn ein Mitglied /bugreport verwendet, erscheint die Meldung hier und im Kanal der gewählten Kategorie.",
    "Quando um membro usa /bugreport, o relato aparece aqui e no canal da categoria."
  ],
  [
    "Try another status or search on this page.",
    "Versuche einen anderen Status oder eine andere Suche auf dieser Seite.",
    "Tente outro status ou outra busca nesta página."
  ],
  [
    "Page {p0} of {p1}",
    "Seite {p0} von {p1}",
    "Página {p0} de {p1}"
  ],
  [
    "Reports refreshed. Unsaved settings above are kept.",
    "Meldungen aktualisiert. Ungespeicherte Einstellungen oben bleiben erhalten.",
    "Relatos atualizados. As configurações não salvas acima foram mantidas."
  ],
  [
    "Report status updated.",
    "Meldungsstatus aktualisiert.",
    "Status do relato atualizado."
  ],
  [
    "Status saved. Discord message refresh is pending.",
    "Status gespeichert. Die Discord-Nachricht wird noch aktualisiert.",
    "Status salvo. A atualização da mensagem no Discord está pendente."
  ],
  [
    "Update status",
    "Status aktualisieren",
    "Atualizar status"
  ],
  [
    "Category name",
    "Kategoriename",
    "Nome da categoria"
  ],
  [
    "Report channel",
    "Meldungskanal",
    "Canal de relatos"
  ],
  [
    "Staff roles",
    "Teamrollen",
    "Cargos da equipe"
  ],
  [
    "Cooldown in minutes",
    "Wartezeit in Minuten",
    "Intervalo em minutos"
  ],
  [
    "Enable bug reports",
    "Fehlermeldungen aktivieren",
    "Ativar relatos de bugs"
  ],
  [
    "Bug report categories",
    "Fehlerkategorien",
    "Categorias de bugs"
  ],
  [
    "Remove category",
    "Kategorie entfernen",
    "Remover categoria"
  ],
  [
    "Remove sticky",
    "Wiederkehrende Nachricht entfernen",
    "Remover mensagem fixa recorrente"
  ],
  [
    "Channel",
    "Kanal",
    "Canal"
  ],
  [
    "Title",
    "Titel",
    "Título"
  ],
  [
    "Description",
    "Beschreibung",
    "Descrição"
  ],
  [
    "Message",
    "Nachricht",
    "Mensagem"
  ],
  [
    "Colour",
    "Farbe",
    "Cor"
  ],
  [
    "Enabled sticky",
    "Wiederkehrende Nachricht aktiviert",
    "Mensagem fixa recorrente ativada"
  ],
  [
    "Message interval",
    "Nachrichtenintervall",
    "Intervalo de mensagens"
  ],
  [
    "Minimum interval in seconds",
    "Mindestintervall in Sekunden",
    "Intervalo mínimo em segundos"
  ],
  [
    "Preview",
    "Vorschau",
    "Prévia"
  ],
  [
    "Choose what your community needs, then give members a simple way to use it.",
    "Wähle aus, was deine Community braucht, und mache es für Mitglieder einfach nutzbar.",
    "Escolha o que sua comunidade precisa e ofereça aos membros uma maneira simples de usar."
  ],
  [
    "Start with /dashboard",
    "Mit /dashboard beginnen",
    "Comece com /dashboard"
  ],
  [
    "Run /dashboard in Discord to open this server’s settings. Run /help for a quick command guide that anyone in the server can read.",
    "Verwende /dashboard in Discord, um die Einstellungen dieses Servers zu öffnen. /help zeigt eine kurze Befehlsübersicht, die alle Servermitglieder lesen können.",
    "Use /dashboard no Discord para abrir as configurações deste servidor. Use /help para ver um guia rápido de comandos que qualquer membro pode ler."
  ],
  [
    "Check the selected server in the sidebar.",
    "Prüfe den ausgewählten Server in der Seitenleiste.",
    "Confira o servidor selecionado na barra lateral."
  ],
  [
    "Open a feature, choose its channels and roles, then save your settings.",
    "Öffne eine Funktion, wähle ihre Kanäle und Rollen und speichere die Einstellungen.",
    "Abra uma função, escolha os canais e cargos e salve as configurações."
  ],
  [
    "If the feature uses a panel, publish it to the channel where members should start. Saving settings alone does not post a panel.",
    "Wenn die Funktion ein Bedienfeld verwendet, veröffentliche es im Einstiegskanal für Mitglieder. Das Speichern der Einstellungen allein veröffentlicht kein Bedienfeld.",
    "Se a função usa um painel, publique-o no canal onde os membros devem começar. Apenas salvar as configurações não publica o painel."
  ],
  [
    "Server owners control dashboard access. If a channel or role is missing, check Cyro’s Discord permissions and role position.",
    "Serverbesitzer steuern den Dashboard-Zugriff. Fehlt ein Kanal oder eine Rolle, prüfe Cyros Discord-Berechtigungen und Rollenposition.",
    "Os donos do servidor controlam o acesso ao painel. Se um canal ou cargo não aparecer, confira as permissões do Cyro e a posição do cargo dele no Discord."
  ],
  [
    "Manage dashboard access",
    "Dashboard-Zugriff verwalten",
    "Gerenciar acesso ao painel"
  ],
  [
    "Set up a feature",
    "Eine Funktion einrichten",
    "Configurar uma função"
  ],
  [
    "Support tickets & applications",
    "Support-Tickets & Bewerbungen",
    "Tickets de suporte e candidaturas"
  ],
  [
    "Set up tickets",
    "Tickets einrichten",
    "Configurar tickets"
  ],
  [
    "Set up temporary voice",
    "Temporäre Sprachkanäle einrichten",
    "Configurar salas de voz temporárias"
  ],
  [
    "Set up bug reports",
    "Fehlermeldungen einrichten",
    "Configurar relatos de bugs"
  ],
  [
    "Set up sticky messages",
    "Wiederkehrende Nachrichten einrichten",
    "Configurar mensagens fixas recorrentes"
  ],
  [
    "Suggestions & polls",
    "Vorschläge & Umfragen",
    "Sugestões e enquetes"
  ],
  [
    "Set up suggestions",
    "Vorschläge einrichten",
    "Configurar sugestões"
  ],
  [
    "Music & text-to-speech",
    "Musik & Sprachausgabe",
    "Música e texto para voz"
  ],
  [
    "Set up music & TTS",
    "Musik & TTS einrichten",
    "Configurar música e TTS"
  ],
  [
    "Creator alerts",
    "Creator-Benachrichtigungen",
    "Alertas de criadores"
  ],
  [
    "Staff activity",
    "Teamaktivität",
    "Atividade da equipe"
  ],
  [
    "View staff activity",
    "Teamaktivität ansehen",
    "Ver atividade da equipe"
  ],
  [
    "A few useful shortcuts",
    "Nützliche Kurzbefehle",
    "Alguns atalhos úteis"
  ],
  [
    "Create a poll",
    "Umfrage erstellen",
    "Criar enquete"
  ],
  [
    "Compose a message",
    "Nachricht verfassen",
    "Escrever mensagem"
  ],
  [
    "Get support",
    "Hilfe erhalten",
    "Obter suporte"
  ],
  [
    "Commands only work when the feature is enabled and your roles have access. If Discord has not refreshed a new command yet, reload the app and check the server’s integration permissions.",
    "Befehle funktionieren nur, wenn die Funktion aktiviert ist und deine Rollen Zugriff haben. Fehlt ein neuer Befehl in Discord, lade die App neu und prüfe die Integrationsberechtigungen des Servers.",
    "Os comandos só funcionam se a função estiver ativada e seus cargos tiverem acesso. Se um comando novo ainda não aparecer, recarregue o Discord e confira as permissões da integração no servidor."
  ],
  [
    "Choose who can manage this server in Cyro and use its commands.",
    "Wähle, wer diesen Server in Cyro verwalten und seine Befehle verwenden darf.",
    "Escolha quem pode gerenciar este servidor no Cyro e usar os comandos."
  ],
  [
    "Controlled by the server owner",
    "Vom Serverbesitzer gesteuert",
    "Controlado pelo dono do servidor"
  ],
  [
    "Only the current Discord server owner can change dashboard access or command roles.",
    "Nur der aktuelle Discord-Serverbesitzer kann den Dashboard-Zugriff oder Befehlsrollen ändern.",
    "Somente o dono atual do servidor no Discord pode alterar o acesso ao painel ou os cargos dos comandos."
  ],
  [
    "Dashboard access",
    "Dashboard-Zugriff",
    "Acesso ao painel"
  ],
  [
    "Allow server managers",
    "Serververwalter zulassen",
    "Permitir gerentes do servidor"
  ],
  [
    "Additional dashboard roles",
    "Zusätzliche Dashboard-Rollen",
    "Cargos adicionais com acesso ao painel"
  ],
  [
    "Allowed command roles",
    "Zulässige Befehlsrollen",
    "Cargos permitidos para o comando"
  ],
  [
    "Command roles",
    "Befehlsrollen",
    "Cargos dos comandos"
  ],
  [
    "Your server stays yours",
    "Dein Server bleibt deiner",
    "Seu servidor continua sendo seu"
  ],
  [
    "Discord permissions still apply",
    "Discord-Berechtigungen gelten weiterhin",
    "As permissões do Discord continuam valendo"
  ],
  [
    "Nothing is posted until you review and publish.",
    "Nichts wird veröffentlicht, bevor du es geprüft und bestätigt hast.",
    "Nada é publicado até você revisar e publicar."
  ],
  [
    "Post in channel",
    "Im Kanal veröffentlichen",
    "Publicar no canal"
  ],
  [
    "Question",
    "Frage",
    "Pergunta"
  ],
  [
    "Answers",
    "Antworten",
    "Respostas"
  ],
  [
    "Duration in hours",
    "Dauer in Stunden",
    "Duração em horas"
  ],
  [
    "Allow multiple answers",
    "Mehrere Antworten erlauben",
    "Permitir várias respostas"
  ],
  [
    "Message text",
    "Nachrichtentext",
    "Texto da mensagem"
  ],
  [
    "Include an embed",
    "Embed einschließen",
    "Incluir embed"
  ],
  [
    "Embed title",
    "Embed-Titel",
    "Título do embed"
  ],
  [
    "Author label",
    "Autorenname",
    "Nome do autor"
  ],
  [
    "Footer",
    "Fußzeile",
    "Rodapé"
  ],
  [
    "Title link",
    "Titellink",
    "Link do título"
  ],
  [
    "Image URL",
    "Bild-URL",
    "URL da imagem"
  ],
  [
    "Thumbnail URL",
    "Vorschaubild-URL",
    "URL da miniatura"
  ],
  [
    "Embed colour bar",
    "Farbiger Embed-Rand",
    "Barra de cor do embed"
  ],
  [
    "Show colour bar",
    "Farbrand anzeigen",
    "Mostrar barra de cor"
  ],
  [
    "Review poll",
    "Umfrage prüfen",
    "Revisar enquete"
  ],
  [
    "Review message",
    "Nachricht prüfen",
    "Revisar mensagem"
  ],
  [
    "Build a poll",
    "Umfrage gestalten",
    "Montar enquete"
  ],
  [
    "Publish poll",
    "Umfrage veröffentlichen",
    "Publicar enquete"
  ],
  [
    "Publish message",
    "Nachricht veröffentlichen",
    "Publicar mensagem"
  ],
  [
    "Publishing…",
    "Wird veröffentlicht…",
    "Publicando…"
  ],
  [
    "Open in Discord",
    "In Discord öffnen",
    "Abrir no Discord"
  ],
  [
    "Published polls",
    "Veröffentlichte Umfragen",
    "Enquetes publicadas"
  ],
  [
    "Published messages",
    "Veröffentlichte Nachrichten",
    "Mensagens publicadas"
  ],
  [
    "Your published posts will appear here.",
    "Deine veröffentlichten Beiträge erscheinen hier.",
    "Suas publicações aparecerão aqui."
  ],
  [
    "How to run a poll",
    "So führst du eine Umfrage durch",
    "Como fazer uma enquete"
  ],
  [
    "One post or a reminder?",
    "Einmaliger Beitrag oder Erinnerung?",
    "Uma publicação ou um lembrete?"
  ],
  [
    "Set up a sticky message",
    "Wiederkehrende Nachricht einrichten",
    "Configurar mensagem fixa recorrente"
  ],
  [
    "Choose a channel first.",
    "Wähle zuerst einen Kanal.",
    "Escolha um canal primeiro."
  ],
  [
    "Up to 300 characters.",
    "Bis zu 300 Zeichen.",
    "Até 300 caracteres."
  ],
  [
    "One answer per line. Between 2 and 10 different answers, up to 55 characters each.",
    "Eine Antwort pro Zeile. Zwischen 2 und 10 verschiedene Antworten mit jeweils höchstens 55 Zeichen.",
    "Uma resposta por linha. Entre 2 e 10 respostas diferentes, com até 55 caracteres cada."
  ],
  [
    "From 1 hour to 32 days. You can end a poll early.",
    "Von 1 Stunde bis 32 Tage. Du kannst eine Umfrage vorzeitig beenden.",
    "De 1 hora a 32 dias. Você pode encerrar a enquete antes."
  ],
  [
    "Current count",
    "Aktueller Zähler",
    "Contagem atual"
  ],
  [
    "Server record",
    "Serverrekord",
    "Recorde do servidor"
  ],
  [
    "Enable counting",
    "Zählspiel aktivieren",
    "Ativar contagem"
  ],
  [
    "Where should members count?",
    "Wo sollen Mitglieder zählen?",
    "Onde os membros devem contar?"
  ],
  [
    "How it works",
    "So funktioniert es",
    "Como funciona"
  ],
  [
    "Start at 1 and count up, one number per message.",
    "Beginnt bei 1 und zählt hoch, eine Zahl pro Nachricht.",
    "Comecem no 1 e sigam contando, um número por mensagem."
  ],
  [
    "A different member must send each number.",
    "Jede Zahl muss von einem anderen Mitglied gesendet werden.",
    "Cada número deve ser enviado por um membro diferente."
  ],
  [
    "An incorrect number resets the count. Your record stays saved.",
    "Eine falsche Zahl setzt den Zähler zurück. Euer Rekord bleibt gespeichert.",
    "Um número incorreto reinicia a contagem. O recorde fica salvo."
  ],
  [
    "Welcome messages",
    "Begrüßungsnachrichten",
    "Mensagens de boas-vindas"
  ],
  [
    "Welcome channel",
    "Begrüßungskanal",
    "Canal de boas-vindas"
  ],
  [
    "Welcome role",
    "Begrüßungsrolle",
    "Cargo de boas-vindas"
  ],
  [
    "Goodbye messages",
    "Abschiedsnachrichten",
    "Mensagens de despedida"
  ],
  [
    "Make it yours",
    "Nach deinen Vorstellungen gestalten",
    "Deixe do seu jeito"
  ],
  [
    "All time",
    "Gesamter Zeitraum",
    "Todo o período"
  ],
  [
    "Last 7 days",
    "Letzte 7 Tage",
    "Últimos 7 dias"
  ],
  [
    "Last 30 days",
    "Letzte 30 Tage",
    "Últimos 30 dias"
  ],
  [
    "Search staff",
    "Team durchsuchen",
    "Buscar na equipe"
  ],
  [
    "Clear filters",
    "Filter zurücksetzen",
    "Limpar filtros"
  ],
  [
    "Search",
    "Suchen",
    "Buscar"
  ],
  [
    "Sort by",
    "Sortieren nach",
    "Ordenar por"
  ],
  [
    "Name",
    "Name",
    "Nome"
  ],
  [
    "Total actions",
    "Aktionen insgesamt",
    "Total de ações"
  ],
  [
    "Claims",
    "Übernahmen",
    "Atendimentos assumidos"
  ],
  [
    "Closures",
    "Abschlüsse",
    "Encerramentos"
  ],
  [
    "Application reviews",
    "Bewerbungsprüfungen",
    "Análises de candidaturas"
  ],
  [
    "Assigned tickets",
    "Zugewiesene Tickets",
    "Tickets atribuídos"
  ],
  [
    "Average claim time",
    "Durchschnittliche Übernahmezeit",
    "Tempo médio para assumir"
  ],
  [
    "Average close time",
    "Durchschnittliche Abschlusszeit",
    "Tempo médio de encerramento"
  ],
  [
    "Dashboard setup needed",
    "Dashboard-Einrichtung erforderlich",
    "É necessário configurar o painel"
  ],
  [
    "Continue with Discord",
    "Mit Discord fortfahren",
    "Continuar com Discord"
  ],
  [
    "Add to Discord",
    "Zu Discord hinzufügen",
    "Adicionar ao Discord"
  ],
  [
    "Skip to content",
    "Zum Inhalt springen",
    "Pular para o conteúdo"
  ],
  [
    "Opening your community dashboard…",
    "Community-Dashboard wird geöffnet…",
    "Abrindo o painel da sua comunidade…"
  ],
  [
    "Cyro · Community dashboard",
    "Cyro · Community-Dashboard",
    "Cyro · Painel da comunidade"
  ],
  [
    "Automatic uses each member’s Discord language for private replies and the server’s preferred language for shared messages.",
    "Automatisch verwendet die Discord-Sprache des jeweiligen Mitglieds für private Antworten und die bevorzugte Serversprache für gemeinsame Nachrichten.",
    "O modo automático usa o idioma do Discord de cada membro nas respostas privadas e o idioma preferido do servidor nas mensagens compartilhadas."
  ],
  [
    "Custom messages and member-written content stay in their original language.",
    "Eigene Nachrichten und von Mitgliedern verfasste Inhalte bleiben in ihrer ursprünglichen Sprache.",
    "As mensagens personalizadas e o conteúdo escrito pelos membros permanecem no idioma original."
  ],
  [
    "British English",
    "Britisches Englisch",
    "Inglês britânico"
  ],
  [
    "American English",
    "Amerikanisches Englisch",
    "Inglês americano"
  ],
  [
    "Male voice",
    "Männliche Stimme",
    "Voz masculina"
  ],
  [
    "Female voice",
    "Weibliche Stimme",
    "Voz feminina"
  ],
  [
    "{name} · {language} · {gender}",
    "{name} · {language} · {gender}",
    "{name} · {language} · {gender}"
  ],
  [
    "{count} messages waiting in the queue.",
    "{count} Nachrichten in der Warteschlange.",
    "{count} mensagens na fila."
  ],
  [
    "{count} tracks waiting in the queue.",
    "{count} Titel in der Warteschlange.",
    "{count} faixas na fila."
  ],
  [
    "Music is unavailable on this host. The bot operator needs to finish the audio setup.",
    "Musik ist auf diesem Host nicht verfügbar. Der Bot-Betreiber muss die Audioeinrichtung abschließen.",
    "A música está indisponível nesta hospedagem. O responsável pelo bot precisa concluir a configuração de áudio."
  ],
  [
    "YouTube links are unavailable on this host. Direct audio and radio links can still be used.",
    "YouTube-Links sind auf diesem Host nicht verfügbar. Direkte Audio- und Radiolinks funktionieren weiterhin.",
    "Os links do YouTube estão indisponíveis nesta hospedagem. Links de áudio direto e rádio ainda podem ser usados."
  ],
  [
    "Text to speech is unavailable on this host. The bot operator needs to install the free voices.",
    "Sprachausgabe ist auf diesem Host nicht verfügbar. Der Bot-Betreiber muss die kostenlosen Stimmen installieren.",
    "O texto para voz está indisponível nesta hospedagem. O responsável pelo bot precisa instalar as vozes gratuitas."
  ],
  [
    "Music accepts direct audio, internet radio and supported public YouTube video links. YouTube playback is best effort and requires the host source installer; playlists, live or restricted videos are not supported. Spotify does not provide full-track audio for this player.",
    "Musik unterstützt direkte Audiolinks, Internetradio und unterstützte öffentliche YouTube-Videos. Die YouTube-Wiedergabe hängt von der Verfügbarkeit ab und erfordert die Quelleninstallation auf dem Host; Playlists, Livestreams und eingeschränkte Videos werden nicht unterstützt. Spotify stellt diesem Player keine vollständigen Titel als Audio bereit.",
    "A música aceita áudio direto, rádios da internet e links de vídeos públicos compatíveis do YouTube. A reprodução do YouTube depende da disponibilidade e requer a instalação do componente de origem na hospedagem; playlists, lives e vídeos restritos não são compatíveis. O Spotify não fornece o áudio completo das músicas para este player."
  ],
  [
    "25 free local Kokoro voices cover English, French, Spanish, Italian, Brazilian Portuguese and Hindi. Select a voice matching the message language; speech does not translate text. Each server uses one voice channel and one mode at a time.",
    "25 kostenlose lokale Kokoro-Stimmen decken Englisch, Französisch, Spanisch, Italienisch, brasilianisches Portugiesisch und Hindi ab. Wähle eine Stimme passend zur Nachrichtensprache; die Sprachausgabe übersetzt keinen Text. Jeder Server verwendet jeweils einen Sprachkanal und einen Modus.",
    "25 vozes Kokoro gratuitas e locais cobrem inglês, francês, espanhol, italiano, português do Brasil e hindi. Escolha uma voz compatível com o idioma da mensagem; a fala não traduz o texto. Cada servidor usa um canal de voz e um modo por vez."
  ],
  [
    "25 free local Kokoro voices cover English, French, Spanish, Italian, Brazilian Portuguese and Hindi. Select a voice matching the message language; speech does not translate text.",
    "25 kostenlose lokale Kokoro-Stimmen decken Englisch, Französisch, Spanisch, Italienisch, brasilianisches Portugiesisch und Hindi ab. Wähle eine Stimme passend zur Nachrichtensprache; die Sprachausgabe übersetzt keinen Text.",
    "25 vozes Kokoro gratuitas e locais cobrem inglês, francês, espanhol, italiano, português do Brasil e hindi. Escolha uma voz compatível com o idioma da mensagem; a fala não traduz o texto."
  ],
  [
    "Session refreshed {p0}. Your settings draft has been kept.",
    "Sitzung um {p0} aktualisiert. Deine ungespeicherten Einstellungen bleiben erhalten.",
    "Sessão atualizada às {p0}. Suas configurações não salvas foram mantidas."
  ],
  [
    "{p0} The previous session information is still shown.",
    "{p0} Die vorherigen Sitzungsinformationen werden weiterhin angezeigt.",
    "{p0} As informações da sessão anterior continuam sendo exibidas."
  ],
  [
    "{error} The save could not be confirmed. Reopen this page to check the saved settings.",
    "{error} Das Speichern konnte nicht bestätigt werden. Öffne diese Seite erneut, um die gespeicherten Einstellungen zu prüfen.",
    "{error} Não foi possível confirmar o salvamento. Abra esta página novamente para conferir as configurações salvas."
  ],
  [
    "{error} Your draft is still here.",
    "{error} Dein Entwurf bleibt erhalten.",
    "{error} Seu rascunho continua aqui."
  ],
  [
    " adds audio to the queue. Use ",
    " fügt Audio zur Warteschlange hinzu. Verwende ",
    " adiciona áudio à fila. Use "
  ],
  [
    " to see what’s next.",
    " für die nächsten Titel.",
    " para ver o que vem a seguir."
  ],
  [
    " skips a track. ",
    " überspringt einen Titel. ",
    " pula uma faixa. "
  ],
  [
    " clears music and leaves the call.",
    " leert die Musikwarteschlange und verlässt den Anruf.",
    " limpa a fila de música e sai da chamada."
  ],
  [
    " starts reading this call’s chat. ",
    " beginnt, den Chat dieses Anrufs vorzulesen. ",
    " começa a ler o chat desta chamada. "
  ],
  [
    " stops it.",
    " beendet die Sprachausgabe.",
    " interrompe a leitura."
  ],
  [
    "Use direct audio, supported radio streams, or a public YouTube video you have permission to play. YouTube support depends on access from this host; playlists and restricted videos are unavailable. Spotify does not provide full-track audio for this bot.",
    "Verwende direkte Audiolinks, unterstützte Radiostreams oder ein öffentliches YouTube-Video, das du abspielen darfst. Die YouTube-Unterstützung hängt vom Zugriff dieses Hosts ab; Playlists und eingeschränkte Videos sind nicht verfügbar. Spotify stellt diesem Bot keine vollständigen Titel als Audio bereit.",
    "Use áudio direto, rádios compatíveis ou um vídeo público do YouTube que você tenha permissão para reproduzir. O suporte ao YouTube depende do acesso desta hospedagem; playlists e vídeos restritos estão indisponíveis. O Spotify não fornece o áudio completo das músicas para este bot."
  ],
  [
    "Each server can have one Cyro voice session. Music and text to speech run separately; stop the current session before starting the other.",
    "Jeder Server kann eine Cyro-Sprachsitzung haben. Musik und Sprachausgabe laufen getrennt; beende die aktuelle Sitzung, bevor du die andere startest.",
    "Cada servidor pode ter uma sessão de voz do Cyro. Música e texto para voz funcionam separadamente; encerre a sessão atual antes de iniciar a outra."
  ],
  [
    "TTS uses 25 free Kokoro voices on Cyro’s host, with Daniel as the default. It reads new eligible messages only, without fetching chat history or sending text to a cloud voice service.",
    "TTS verwendet 25 kostenlose Kokoro-Stimmen auf Cyros Host, standardmäßig Daniel. Es liest nur neue geeignete Nachrichten vor, ohne den Chatverlauf abzurufen oder Text an einen Cloud-Sprachdienst zu senden.",
    "O TTS usa 25 vozes Kokoro gratuitas na hospedagem do Cyro, com Daniel como padrão. Ele lê apenas mensagens novas elegíveis, sem buscar o histórico do chat nem enviar texto para um serviço de voz na nuvem."
  ],
  [
    "Create the categories or forms your server needs, choose the staff roles and destination channels, then publish a button or dropdown panel. Ticket closure saves a transcript before the configured archive or deletion.",
    "Erstelle die Kategorien oder Formulare, die dein Server braucht, wähle Teamrollen und Zielkanäle und veröffentliche anschließend ein Bedienfeld mit Schaltflächen oder Auswahlmenü. Beim Schließen eines Tickets wird vor dem eingestellten Archivieren oder Löschen ein Transkript gespeichert.",
    "Crie as categorias ou os formulários de que seu servidor precisa, escolha os cargos da equipe e os canais de destino e publique um painel com botões ou menu de seleção. Ao fechar um ticket, uma transcrição é salva antes do arquivamento ou da exclusão configurada."
  ],
  [
    "Choose a voice lobby and destination category. Joining the lobby creates a room and moves the member into it. Open the room’s text chat to lock, unlock, rename or set a member limit. Allow member lets someone into a locked room; Remove member disconnects someone from that room. Both open searchable member pickers. Empty rooms close automatically; new rooms follow the category’s visibility.",
    "Wähle eine Sprachlobby und eine Zielkategorie. Beim Beitreten wird ein Raum erstellt und das Mitglied dorthin verschoben. Im Raumchat kannst du ihn sperren, entsperren, umbenennen oder begrenzen. „Mitglied zulassen“ gewährt Zugang zu einem gesperrten Raum; „Mitglied entfernen“ trennt jemanden von diesem Raum. Beide öffnen eine durchsuchbare Mitgliederliste. Leere Räume schließen automatisch; neue Räume übernehmen die Sichtbarkeit ihrer Kategorie.",
    "Escolha um canal de acesso de voz e uma categoria de destino. Entrar no canal cria uma sala e move o membro para ela. Abra o chat da sala para trancar, destrancar, renomear ou definir um limite de membros. Permitir membro libera a entrada em uma sala trancada; Remover membro desconecta alguém dessa sala. Ambos abrem listas de membros com busca. Salas vazias são fechadas automaticamente; novas salas seguem a visibilidade da categoria."
  ],
  [
    "Create a category for each kind of problem, such as Bot issues, Server issues or a game resource. Members use /bugreport and choose a category. Reports include their author and go to the chosen channel; staff can mark them in progress, resolved or dismissed.",
    "Erstelle für jede Problemart eine Kategorie, etwa Bot-Probleme, Serverprobleme oder eine Spielressource. Mitglieder verwenden /bugreport und wählen eine Kategorie. Meldungen enthalten ihren Verfasser und gehen an den gewählten Kanal; das Team kann sie als in Bearbeitung, behoben oder verworfen markieren.",
    "Crie uma categoria para cada tipo de problema, como falhas do bot, do servidor ou de um recurso de jogo. Os membros usam /bugreport e escolhem uma categoria. Os relatos incluem o autor e vão para o canal escolhido; a equipe pode marcá-los como em andamento, resolvidos ou descartados."
  ],
  [
    "Choose a channel, write an embed and set how many messages and how much time should pass before it is refreshed. Cyro replaces its previous sticky after new chat activity. It does not remove members’ messages.",
    "Wähle einen Kanal, verfasse ein Embed und lege fest, wie viele Nachrichten und wie viel Zeit vor der Aktualisierung vergehen sollen. Cyro ersetzt seine vorherige wiederkehrende Nachricht nach neuer Chataktivität. Nachrichten von Mitgliedern werden nicht entfernt.",
    "Escolha um canal, escreva um embed e defina quantas mensagens e quanto tempo devem passar antes da atualização. O Cyro substitui a mensagem fixa recorrente anterior após nova atividade no chat. Ele não remove mensagens dos membros."
  ],
  [
    "Enable a suggestions channel so members can use /suggestion. People vote on its buttons and staff record a decision. For a specific question with answer choices, use the poll builder; Discord handles the votes and closing time.",
    "Aktiviere einen Vorschlagskanal, damit Mitglieder /suggestion verwenden können. Sie stimmen über Schaltflächen ab und das Team hält eine Entscheidung fest. Für konkrete Fragen mit Antwortmöglichkeiten verwende den Umfrageeditor; Discord übernimmt Abstimmung und Endzeit.",
    "Ative um canal de sugestões para que os membros possam usar /suggestion. As pessoas votam pelos botões e a equipe registra uma decisão. Para uma pergunta específica com opções de resposta, use o criador de enquetes; o Discord cuida dos votos e do horário de encerramento."
  ],
  [
    "Enable voice features, then join a call and use /playmusic with a supported link, or /addtts to read new messages in that call’s chat. Each member chooses /ttsvoice. The speaker-name switch adds “Frosty said” before messages. /stoptts or /stopmusic disconnects Cyro.",
    "Aktiviere die Sprachfunktionen, tritt einem Anruf bei und verwende /playmusic mit einem unterstützten Link oder /addtts zum Vorlesen neuer Chatnachrichten dieses Anrufs. Jedes Mitglied wählt seine Stimme mit /ttsvoice. Die Namensoption fügt vor Nachrichten „Frosty sagt“ hinzu. /stoptts oder /stopmusic trennt Cyro vom Anruf.",
    "Ative as funções de voz, entre em uma chamada e use /playmusic com um link compatível ou /addtts para ler as novas mensagens do chat dessa chamada. Cada membro escolhe sua voz com /ttsvoice. A opção de nome adiciona “Frosty disse” antes das mensagens. /stoptts ou /stopmusic desconecta o Cyro."
  ],
  [
    "Make one profile per creator, link their Discord member and add platform accounts. Choose announcement channels, title filters and roles for each account. Available live and upload features depend on the platform connection.",
    "Erstelle ein Profil pro Creator, verknüpfe das Discord-Mitglied und füge Plattformkonten hinzu. Wähle Ankündigungskanäle, Titelfilter und Rollen für jedes Konto. Verfügbare Live- und Upload-Funktionen hängen von der Plattformverbindung ab.",
    "Crie um perfil por criador, vincule o membro do Discord e adicione as contas das plataformas. Escolha canais de anúncios, filtros de título e cargos para cada conta. As funções de lives e vídeos publicados dependem da conexão com cada plataforma."
  ],
  [
    "Compare ticket claims, closures, manual moderation and application reviews over 7 days, 30 days or retained history. Assigned tickets show current workload. Average claim and close times begin when the ticket was created; counts alone are not a measure of service quality.",
    "Vergleiche Ticketübernahmen, Abschlüsse, manuelle Moderation und Bewerbungsprüfungen über 7 Tage, 30 Tage oder den gespeicherten Verlauf. Zugewiesene Tickets zeigen die aktuelle Arbeitslast. Durchschnittliche Übernahme- und Abschlusszeiten beginnen bei der Ticketerstellung; reine Zahlen messen keine Servicequalität.",
    "Compare tickets assumidos e encerrados, ações manuais de moderação e análises de candidaturas em 7 dias, 30 dias ou no histórico mantido. Tickets atribuídos mostram a carga atual de trabalho. Os tempos médios para assumir e encerrar começam na criação do ticket; os números sozinhos não medem a qualidade do atendimento."
  ],
  [
    "/poll opens the poll builder. /embed opens the message composer. /confess posts to the configured confession channel. /ping checks Cyro’s connection.",
    "/poll öffnet den Umfrageeditor. /embed öffnet den Nachrichteneditor. /confess veröffentlicht im eingerichteten Geständniskanal. /ping prüft Cyros Verbindung.",
    "/poll abre o criador de enquetes. /embed abre o editor de mensagens. /confess publica no canal de confissões configurado. /ping verifica a conexão do Cyro."
  ],
  [
    "7 days",
    "7 Tage",
    "7 dias"
  ],
  [
    "30 days",
    "30 Tage",
    "30 dias"
  ],
  [
    "Retained history",
    "Gespeicherter Verlauf",
    "Histórico mantido"
  ],
  [
    "Most total actions",
    "Meiste Aktionen insgesamt",
    "Maior total de ações"
  ],
  [
    "Most tickets closed",
    "Meiste geschlossene Tickets",
    "Mais tickets encerrados"
  ],
  [
    "Most tickets claimed",
    "Meiste übernommene Tickets",
    "Mais tickets assumidos"
  ],
  [
    "Most moderation actions",
    "Meiste Moderationsaktionen",
    "Mais ações de moderação"
  ],
  [
    "Most applications reviewed",
    "Meiste geprüfte Bewerbungen",
    "Mais candidaturas analisadas"
  ],
  [
    "Most tickets assigned now",
    "Meiste aktuell zugewiesene Tickets",
    "Mais tickets atribuídos agora"
  ],
  [
    "Fastest average claim",
    "Schnellste durchschnittliche Übernahme",
    "Menor tempo médio para assumir"
  ],
  [
    "Fastest average close",
    "Schnellster durchschnittlicher Abschluss",
    "Menor tempo médio de encerramento"
  ],
  [
    "All staff activity",
    "Gesamte Teamaktivität",
    "Toda a atividade da equipe"
  ],
  [
    "Ticket activity",
    "Ticketaktivität",
    "Atividade de tickets"
  ],
  [
    "Moderation activity",
    "Moderationsaktivität",
    "Atividade de moderação"
  ],
  [
    "Rank",
    "Rang",
    "Posição"
  ],
  [
    "Staff member",
    "Teammitglied",
    "Membro da equipe"
  ],
  [
    "Closes",
    "Abschlüsse",
    "Encerramentos"
  ],
  [
    "Assigned now",
    "Aktuell zugewiesen",
    "Atribuídos agora"
  ],
  [
    "Avg. claim",
    "Ø Übernahme",
    "Média para assumir"
  ],
  [
    "Avg. close",
    "Ø Abschluss",
    "Média de encerramento"
  ],
  [
    "Creator profiles",
    "Creator-Profile",
    "Perfis de criadores"
  ],
  [
    "Platform accounts",
    "Plattformkonten",
    "Contas das plataformas"
  ],
  [
    "Past 7 days",
    "Vergangene 7 Tage",
    "Últimos 7 dias"
  ],
  [
    "Past 30 days",
    "Vergangene 30 Tage",
    "Últimos 30 dias"
  ],
  [
    "Tracked time",
    "Erfasste Zeit",
    "Tempo registrado"
  ],
  [
    "Average concurrent viewers",
    "Durchschnittlich gleichzeitige Zuschauer",
    "Média de espectadores simultâneos"
  ],
  [
    "Net followers",
    "Netto-Follower",
    "Saldo de seguidores"
  ],
  [
    "Creator",
    "Creator",
    "Criador"
  ],
  [
    "Platform account",
    "Plattformkonto",
    "Conta da plataforma"
  ],
  [
    "Platform time",
    "Plattformzeit",
    "Tempo por plataforma"
  ],
  [
    "Avg. viewers",
    "Ø Zuschauer",
    "Média de espectadores"
  ],
  [
    "Highest platform peak",
    "Höchster Plattform-Spitzenwert",
    "Maior pico por plataforma"
  ],
  [
    "Peak viewers",
    "Zuschauerspitze",
    "Pico de espectadores"
  ],
  [
    "Sessions",
    "Sitzungen",
    "Sessões"
  ],
  [
    "Left edge",
    "Linker Rand",
    "Borda esquerda"
  ],
  [
    "Top edge",
    "Oberer Rand",
    "Borda superior"
  ],
  [
    "No bar",
    "Kein Rand",
    "Sem barra"
  ],
  [
    "All suggestions",
    "Alle Vorschläge",
    "Todas as sugestões"
  ],
  [
    "Voting open",
    "Abstimmung offen",
    "Votação aberta"
  ],
  [
    "Accepted",
    "Angenommen",
    "Aceito"
  ],
  [
    "Declined",
    "Abgelehnt",
    "Recusado"
  ],
  [
    "Accept",
    "Annehmen",
    "Aceitar"
  ],
  [
    "Decline",
    "Ablehnen",
    "Recusar"
  ],
  [
    "Close without a decision",
    "Ohne Entscheidung schließen",
    "Fechar sem decisão"
  ],
  [
    "Contains this text",
    "Enthält diesen Text",
    "Contém este texto"
  ],
  [
    "Exactly this text",
    "Genau dieser Text",
    "Exatamente este texto"
  ],
  [
    "Keep the role until their next visible status",
    "Rolle bis zum nächsten sichtbaren Status behalten",
    "Manter o cargo até o próximo status visível"
  ],
  [
    "Remove the role while offline or invisible",
    "Rolle bei Offline- oder Unsichtbar-Status entfernen",
    "Remover o cargo enquanto estiver offline ou invisível"
  ],
  [
    "Roles assigned",
    "Rollen zugewiesen",
    "Cargos atribuídos"
  ],
  [
    "Waiting to add",
    "Hinzufügen ausstehend",
    "Aguardando adição"
  ],
  [
    "Waiting to remove",
    "Entfernen ausstehend",
    "Aguardando remoção"
  ],
  [
    "Ticket visibility",
    "Ticketsichtbarkeit",
    "Visibilidade dos tickets"
  ],
  [
    "Use Discord category permissions",
    "Discord-Kategorieberechtigungen verwenden",
    "Usar permissões da categoria do Discord"
  ],
  [
    "Private ticket",
    "Privates Ticket",
    "Ticket privado"
  ],
  [
    "After saving the transcript",
    "Nach dem Speichern des Transkripts",
    "Após salvar a transcrição"
  ],
  [
    "Keep a read-only channel",
    "Schreibgeschützten Kanal behalten",
    "Manter canal somente leitura"
  ],
  [
    "Delete the ticket channel",
    "Ticketkanal löschen",
    "Excluir canal do ticket"
  ],
  [
    "Member chooses with",
    "Mitglieder wählen über",
    "Membros escolhem por"
  ],
  [
    "Buttons",
    "Schaltflächen",
    "Botões"
  ],
  [
    "Dropdown menu",
    "Auswahlmenü",
    "Menu de seleção"
  ],
  [
    "Verification method",
    "Verifizierungsmethode",
    "Método de verificação"
  ],
  [
    "Image challenge + button",
    "Bildprüfung + Schaltfläche",
    "Desafio de imagem e botão"
  ],
  [
    "React with a check mark",
    "Mit einem Häkchen reagieren",
    "Reagir com uma marca de confirmação"
  ],
  [
    "When someone joins",
    "Wenn jemand beitritt",
    "Quando alguém entra"
  ],
  [
    "When someone leaves",
    "Wenn jemand geht",
    "Quando alguém sai"
  ],
  [
    "Card background",
    "Kartenhintergrund",
    "Fundo do cartão"
  ],
  [
    "Message only",
    "Nur Nachricht",
    "Somente mensagem"
  ],
  [
    "Image only",
    "Nur Bild",
    "Somente imagem"
  ],
  [
    "Image card only",
    "Nur Bildkarte",
    "Somente cartão de imagem"
  ],
  [
    "Message and image",
    "Nachricht und Bild",
    "Mensagem e imagem"
  ],
  [
    "Message + image card",
    "Nachricht + Bildkarte",
    "Mensagem e cartão de imagem"
  ],
  [
    "No announcement",
    "Keine Ankündigung",
    "Sem anúncio"
  ],
  [
    "Midnight blue",
    "Mitternachtsblau",
    "Azul-meia-noite"
  ],
  [
    "Deep aurora",
    "Dunkles Polarlicht",
    "Aurora profunda"
  ],
  [
    "Icy slate",
    "Eisiger Schiefer",
    "Ardósia gelada"
  ],
  [
    "Custom solid colour",
    "Eigene Volltonfarbe",
    "Cor sólida personalizada"
  ],
  [
    "Event",
    "Ereignis",
    "Evento"
  ],
  [
    "Member",
    "Mitglied",
    "Membro"
  ],
  [
    "Invited by",
    "Eingeladen von",
    "Convidado por"
  ],
  [
    "Invite source",
    "Einladungsquelle",
    "Origem do convite"
  ],
  [
    "When",
    "Zeitpunkt",
    "Quando"
  ],
  [
    "Action",
    "Aktion",
    "Ação"
  ],
  [
    "Reason",
    "Grund",
    "Motivo"
  ],
  [
    "Date",
    "Datum",
    "Data"
  ],
  [
    "Ticket",
    "Ticket",
    "Ticket"
  ],
  [
    "Form",
    "Formular",
    "Formulário"
  ],
  [
    "Created",
    "Erstellt",
    "Criado"
  ],
  [
    "Transcript",
    "Transkript",
    "Transcrição"
  ],
  [
    "Update the message to offline",
    "Nachricht auf offline aktualisieren",
    "Atualizar a mensagem ao ficar offline"
  ],
  [
    "Delete the announcement",
    "Ankündigung löschen",
    "Excluir anúncio"
  ],
  [
    "Keep the announcement",
    "Ankündigung behalten",
    "Manter anúncio"
  ],
  [
    "Accent bar",
    "Akzentleiste",
    "Barra de destaque"
  ],
  [
    "Accept applications",
    "Bewerbungen annehmen",
    "Aceitar candidaturas"
  ],
  [
    "Accept new requests",
    "Neue Anfragen annehmen",
    "Aceitar novos pedidos"
  ],
  [
    "Account sessions",
    "Kontositzungen",
    "Sessões da conta"
  ],
  [
    "Account settings saved.",
    "Kontoeinstellungen gespeichert.",
    "Configurações da conta salvas."
  ],
  [
    "Account username or YouTube channel",
    "Kontonutzername oder YouTube-Kanal",
    "Nome de usuário da conta ou canal do YouTube"
  ],
  [
    "Accounts awaiting a profile",
    "Konten ohne Profil",
    "Contas aguardando um perfil"
  ],
  [
    "Accounts ranked",
    "Konten in der Rangliste",
    "Contas no ranking"
  ],
  [
    "Active staff",
    "Aktive Teammitglieder",
    "Membros ativos da equipe"
  ],
  [
    "Add a role",
    "Rolle hinzufügen",
    "Adicionar cargo"
  ],
  [
    "Add category",
    "Kategorie hinzufügen",
    "Adicionar categoria"
  ],
  [
    "Add field",
    "Feld hinzufügen",
    "Adicionar campo"
  ],
  [
    "Add form",
    "Formular hinzufügen",
    "Adicionar formulário"
  ],
  [
    "Add panel",
    "Bedienfeld hinzufügen",
    "Adicionar painel"
  ],
  [
    "Add platform",
    "Plattform hinzufügen",
    "Adicionar plataforma"
  ],
  [
    "Add to this server",
    "Zu diesem Server hinzufügen",
    "Adicionar a este servidor"
  ],
  [
    "Add your first channel reminder",
    "Erste Kanalerinnerung hinzufügen",
    "Adicionar o primeiro lembrete de canal"
  ],
  [
    "Alert channel",
    "Benachrichtigungskanal",
    "Canal de alertas"
  ],
  [
    "Alert cooldown (seconds)",
    "Benachrichtigungswartezeit (Sekunden)",
    "Intervalo entre alertas (segundos)"
  ],
  [
    "All events",
    "Alle Ereignisse",
    "Todos os eventos"
  ],
  [
    "All requests paused",
    "Alle Anfragen pausiert",
    "Todos os pedidos pausados"
  ],
  [
    "Announce new uploaded videos",
    "Neue hochgeladene Videos ankündigen",
    "Anunciar novos vídeos publicados"
  ],
  [
    "Announce when live",
    "Live-Streams ankündigen",
    "Anunciar quando estiver ao vivo"
  ],
  [
    "Announcement message",
    "Ankündigungstext",
    "Mensagem do anúncio"
  ],
  [
    "Anonymous confession",
    "Anonymes Geständnis",
    "Confissão anônima"
  ],
  [
    "Anonymous posts sent to Discord",
    "Anonyme Beiträge an Discord gesendet",
    "Publicações anônimas enviadas ao Discord"
  ],
  [
    "Anonymous to other members",
    "Für andere Mitglieder anonym",
    "Anônimo para outros membros"
  ],
  [
    "Answer",
    "Antwort",
    "Resposta"
  ],
  [
    "Anti-spam",
    "Spamschutz",
    "Antispam"
  ],
  [
    "Appearance saved to Discord for this server.",
    "Erscheinungsbild für diesen Server in Discord gespeichert.",
    "Aparência salva no Discord para este servidor."
  ],
  [
    "Appearance unavailable",
    "Erscheinungsbild nicht verfügbar",
    "Aparência indisponível"
  ],
  [
    "Application forms",
    "Bewerbungsformulare",
    "Formulários de candidatura"
  ],
  [
    "Arrival & departure announcements",
    "Beitritts- und Abschiedsankündigungen",
    "Anúncios de entrada e saída"
  ],
  [
    "Average claim / close",
    "Durchschnittliche Übernahme / Abschluss",
    "Média para assumir / encerrar"
  ],
  [
    "Bar colour",
    "Leistenfarbe",
    "Cor da barra"
  ],
  [
    "Before publishing",
    "Vor dem Veröffentlichen",
    "Antes de publicar"
  ],
  [
    "Blocked words & phrases",
    "Gesperrte Wörter & Ausdrücke",
    "Palavras e expressões bloqueadas"
  ],
  [
    "Bot nickname",
    "Bot-Spitzname",
    "Apelido do bot"
  ],
  [
    "Bot picture preview",
    "Vorschau des Bot-Bildes",
    "Prévia da foto do bot"
  ],
  [
    "Brand label",
    "Markenbeschriftung",
    "Nome da marca"
  ],
  [
    "Bring a friend",
    "Bring einen Freund mit",
    "Traga um amigo"
  ],
  [
    "Button label",
    "Schaltflächenbeschriftung",
    "Texto do botão"
  ],
  [
    "Card accent",
    "Kartenakzent",
    "Destaque do cartão"
  ],
  [
    "Challenge name",
    "Challenge-Name",
    "Nome do desafio"
  ],
  [
    "Checking creator and channel access…",
    "Creator- und Kanalzugriff werden geprüft…",
    "Verificando acesso ao criador e ao canal…"
  ],
  [
    "Checking your image…",
    "Bild wird geprüft…",
    "Verificando sua imagem…"
  ],
  [
    "Choose a creator profile",
    "Creator-Profil auswählen",
    "Escolha um perfil de criador"
  ],
  [
    "Choose an option",
    "Option auswählen",
    "Escolha uma opção"
  ],
  [
    "Choose this role",
    "Diese Rolle wählen",
    "Escolher este cargo"
  ],
  [
    "Choose who can read the log",
    "Festlegen, wer das Protokoll lesen kann",
    "Escolha quem pode ler o registro"
  ],
  [
    "Claims, closes, moderation and reviews",
    "Übernahmen, Abschlüsse, Moderation und Prüfungen",
    "Atendimentos assumidos, encerramentos, moderação e análises"
  ],
  [
    "Closed-ticket archive",
    "Archiv geschlossener Tickets",
    "Arquivo de tickets encerrados"
  ],
  [
    "Combined platform time",
    "Zusammengefasste Plattformzeit",
    "Tempo combinado das plataformas"
  ],
  [
    "Community ideas",
    "Community-Ideen",
    "Ideias da comunidade"
  ],
  [
    "Community levels",
    "Community-Level",
    "Níveis da comunidade"
  ],
  [
    "Community member",
    "Community-Mitglied",
    "Membro da comunidade"
  ],
  [
    "Completed during this period",
    "In diesem Zeitraum abgeschlossen",
    "Concluídos neste período"
  ],
  [
    "Confession board",
    "Geständniswand",
    "Mural de confissões"
  ],
  [
    "Confession settings saved.",
    "Geständniseinstellungen gespeichert.",
    "Configurações de confissões salvas."
  ],
  [
    "Confession totals",
    "Geständniszähler",
    "Totais de confissões"
  ],
  [
    "Confessions channel",
    "Geständniskanal",
    "Canal de confissões"
  ],
  [
    "Confessions unavailable",
    "Geständnisse nicht verfügbar",
    "Confissões indisponíveis"
  ],
  [
    "Confirmed active",
    "Bestätigt aktiv",
    "Ativo confirmado"
  ],
  [
    "Connect a platform account",
    "Plattformkonto verbinden",
    "Conectar conta de plataforma"
  ],
  [
    "Connect account",
    "Konto verbinden",
    "Conectar conta"
  ],
  [
    "Connecting…",
    "Verbindung wird hergestellt…",
    "Conectando…"
  ],
  [
    "Create a creator profile",
    "Creator-Profil erstellen",
    "Criar perfil de criador"
  ],
  [
    "Create profile",
    "Profil erstellen",
    "Criar perfil"
  ],
  [
    "Create your first profile",
    "Erstes Profil erstellen",
    "Criar seu primeiro perfil"
  ],
  [
    "Creator name",
    "Creator-Name",
    "Nome do criador"
  ],
  [
    "Creator profile",
    "Creator-Profil",
    "Perfil do criador"
  ],
  [
    "Creator profile saved.",
    "Creator-Profil gespeichert.",
    "Perfil do criador salvo."
  ],
  [
    "Creator sign-in",
    "Creator-Anmeldung",
    "Login do criador"
  ],
  [
    "Creator standings",
    "Creator-Platzierungen",
    "Classificação dos criadores"
  ],
  [
    "Creators ranked",
    "Creator in der Rangliste",
    "Criadores no ranking"
  ],
  [
    "Current count compared with server record",
    "Aktueller Zähler im Vergleich zum Serverrekord",
    "Contagem atual comparada ao recorde do servidor"
  ],
  [
    "Custom background colour",
    "Eigene Hintergrundfarbe",
    "Cor de fundo personalizada"
  ],
  [
    "Cyro overview",
    "Cyro-Übersicht",
    "Visão geral do Cyro"
  ],
  [
    "Dashboard only",
    "Nur Dashboard",
    "Somente painel"
  ],
  [
    "Decision",
    "Entscheidung",
    "Decisão"
  ],
  [
    "Delete profile",
    "Profil löschen",
    "Excluir perfil"
  ],
  [
    "Delete this empty profile?",
    "Dieses leere Profil löschen?",
    "Excluir este perfil vazio?"
  ],
  [
    "Delivery totals",
    "Zustellungszahlen",
    "Totais de envio"
  ],
  [
    "Delivery unconfirmed",
    "Zustellung unbestätigt",
    "Envio não confirmado"
  ],
  [
    "Demo appearance saved.",
    "Demo-Erscheinungsbild gespeichert.",
    "Aparência da demonstração salva."
  ],
  [
    "Demo confession settings saved.",
    "Demo-Geständniseinstellungen gespeichert.",
    "Configurações de confissões da demonstração salvas."
  ],
  [
    "Demo status role settings saved.",
    "Demo-Statusrolleneinstellungen gespeichert.",
    "Configurações de cargos por status da demonstração salvas."
  ],
  [
    "Demo suggestion settings saved.",
    "Demo-Vorschlagseinstellungen gespeichert.",
    "Configurações de sugestões da demonstração salvas."
  ],
  [
    "Departures",
    "Austritte",
    "Saídas"
  ],
  [
    "Discord member ID",
    "Discord-Mitglieds-ID",
    "ID do membro no Discord"
  ],
  [
    "Discord panel preview",
    "Discord-Bedienfeldvorschau",
    "Prévia do painel no Discord"
  ],
  [
    "Discord preview",
    "Discord-Vorschau",
    "Prévia no Discord"
  ],
  [
    "Display inline",
    "Nebeneinander anzeigen",
    "Exibir na mesma linha"
  ],
  [
    "Dropdown",
    "Auswahlmenü",
    "Menu de seleção"
  ],
  [
    "Enable confessions",
    "Geständnisse aktivieren",
    "Ativar confissões"
  ],
  [
    "Enable greetings & join roles",
    "Begrüßungen & Beitrittsrollen aktivieren",
    "Ativar boas-vindas e cargos de entrada"
  ],
  [
    "Enable moderation",
    "Moderation aktivieren",
    "Ativar moderação"
  ],
  [
    "Enable status roles",
    "Statusrollen aktivieren",
    "Ativar cargos por status"
  ],
  [
    "Enable suggestions",
    "Vorschläge aktivieren",
    "Ativar sugestões"
  ],
  [
    "Enable support tickets",
    "Support-Tickets aktivieren",
    "Ativar tickets de suporte"
  ],
  [
    "Enable this reminder",
    "Diese Erinnerung aktivieren",
    "Ativar este lembrete"
  ],
  [
    "Enable verification",
    "Verifizierung aktivieren",
    "Ativar verificação"
  ],
  [
    "End poll",
    "Umfrage beenden",
    "Encerrar enquete"
  ],
  [
    "End this poll?",
    "Diese Umfrage beenden?",
    "Encerrar esta enquete?"
  ],
  [
    "Event type",
    "Ereignistyp",
    "Tipo de evento"
  ],
  [
    "Example custom status",
    "Beispielstatus",
    "Exemplo de status personalizado"
  ],
  [
    "Existing requests keep their settings",
    "Bestehende Anfragen behalten ihre Einstellungen",
    "Os pedidos existentes mantêm suas configurações"
  ],
  [
    "Field name",
    "Feldname",
    "Nome do campo"
  ],
  [
    "Field value",
    "Feldinhalt",
    "Valor do campo"
  ],
  [
    "Filter suggestions",
    "Vorschläge filtern",
    "Filtrar sugestões"
  ],
  [
    "Find a staff member",
    "Teammitglied suchen",
    "Encontrar membro da equipe"
  ],
  [
    "For example, Server issues",
    "Zum Beispiel Serverprobleme",
    "Por exemplo, Problemas do servidor"
  ],
  [
    "Form name",
    "Formularname",
    "Nome do formulário"
  ],
  [
    "From idea to decision",
    "Von der Idee zur Entscheidung",
    "Da ideia à decisão"
  ],
  [
    "General application",
    "Allgemeine Bewerbung",
    "Candidatura geral"
  ],
  [
    "General support",
    "Allgemeiner Support",
    "Suporte geral"
  ],
  [
    "Goodbye message",
    "Abschiedsnachricht",
    "Mensagem de despedida"
  ],
  [
    "How members report a problem",
    "So melden Mitglieder ein Problem",
    "Como os membros relatam um problema"
  ],
  [
    "How reminders stay visible",
    "So bleiben Erinnerungen sichtbar",
    "Como os lembretes ficam visíveis"
  ],
  [
    "Image card style",
    "Bildkartenstil",
    "Estilo do cartão de imagem"
  ],
  [
    "Interrupted operations",
    "Unterbrochene Vorgänge",
    "Operações interrompidas"
  ],
  [
    "Invite challenge",
    "Einladungs-Challenge",
    "Desafio de convites"
  ],
  [
    "Invite history",
    "Einladungsverlauf",
    "Histórico de convites"
  ],
  [
    "Invite leaderboard",
    "Einladungsrangliste",
    "Ranking de convites"
  ],
  [
    "Invite log channel",
    "Einladungsprotokollkanal",
    "Canal de registro de convites"
  ],
  [
    "Invites to reach the goal",
    "Einladungen bis zum Ziel",
    "Convites para atingir a meta"
  ],
  [
    "Join footer",
    "Beitrittsfußzeile",
    "Rodapé de entrada"
  ],
  [
    "Join heading",
    "Beitrittsüberschrift",
    "Título de entrada"
  ],
  [
    "Joined",
    "Beigetreten",
    "Entrou"
  ],
  [
    "Joins",
    "Beitritte",
    "Entradas"
  ],
  [
    "Keep account",
    "Konto behalten",
    "Manter conta"
  ],
  [
    "Keep in current category",
    "In aktueller Kategorie belassen",
    "Manter na categoria atual"
  ],
  [
    "Keep it",
    "Behalten",
    "Manter"
  ],
  [
    "Keep panel",
    "Bedienfeld behalten",
    "Manter painel"
  ],
  [
    "Keep profile",
    "Profil behalten",
    "Manter perfil"
  ],
  [
    "Keep reviewing",
    "Weiter prüfen",
    "Continuar revisando"
  ],
  [
    "Keep running",
    "Weiterlaufen lassen",
    "Continuar em andamento"
  ],
  [
    "Large name text",
    "Großer Namenstext",
    "Texto grande do nome"
  ],
  [
    "Large text colour",
    "Farbe des großen Textes",
    "Cor do texto grande"
  ],
  [
    "Leaderboard period",
    "Ranglistenzeitraum",
    "Período do ranking"
  ],
  [
    "Leaderboard time period",
    "Ranglistenzeitraum",
    "Período de tempo do ranking"
  ],
  [
    "Leaderboard view",
    "Ranglistenansicht",
    "Visualização do ranking"
  ],
  [
    "Leave footer",
    "Abschiedsfußzeile",
    "Rodapé de saída"
  ],
  [
    "Leave heading",
    "Abschiedsüberschrift",
    "Título de saída"
  ],
  [
    "Left",
    "Verlassen",
    "Saiu"
  ],
  [
    "Let members choose their roles",
    "Mitglieder ihre Rollen wählen lassen",
    "Permitir que os membros escolham seus cargos"
  ],
  [
    "Live alerts enabled.",
    "Live-Benachrichtigungen aktiviert.",
    "Alertas de live ativados."
  ],
  [
    "Live alerts paused. Upload settings are unchanged.",
    "Live-Benachrichtigungen pausiert. Upload-Einstellungen bleiben unverändert.",
    "Alertas de live pausados. As configurações de vídeos publicados não foram alteradas."
  ],
  [
    "Loading confession settings…",
    "Geständniseinstellungen werden geladen…",
    "Carregando configurações de confissões…"
  ],
  [
    "Loading status role settings…",
    "Statusrolleneinstellungen werden geladen…",
    "Carregando configurações de cargos por status…"
  ],
  [
    "Loading suggestions…",
    "Vorschläge werden geladen…",
    "Carregando sugestões…"
  ],
  [
    "Loading the bot’s current Discord appearance…",
    "Aktuelles Discord-Erscheinungsbild des Bots wird geladen…",
    "Carregando a aparência atual do bot no Discord…"
  ],
  [
    "Log joins and departures",
    "Beitritte und Austritte protokollieren",
    "Registrar entradas e saídas"
  ],
  [
    "Made for this server",
    "Für diesen Server gemacht",
    "Feito para este servidor"
  ],
  [
    "Manage my TikTok connection",
    "Meine TikTok-Verbindung verwalten",
    "Gerenciar minha conexão com o TikTok"
  ],
  [
    "Manage stream alerts",
    "Stream-Benachrichtigungen verwalten",
    "Gerenciar alertas de transmissão"
  ],
  [
    "Match capital letters",
    "Groß-/Kleinschreibung beachten",
    "Diferenciar maiúsculas e minúsculas"
  ],
  [
    "Matching rule",
    "Abgleichregel",
    "Regra de correspondência"
  ],
  [
    "Member joins",
    "Mitglied tritt bei",
    "Membro entra"
  ],
  [
    "Member leaves",
    "Mitglied verlässt den Server",
    "Membro sai"
  ],
  [
    "Member panels",
    "Mitglieder-Bedienfelder",
    "Painéis para membros"
  ],
  [
    "Member verification",
    "Mitgliederverifizierung",
    "Verificação de membros"
  ],
  [
    "Member, inviter or invite code",
    "Mitglied, Einladender oder Einladungscode",
    "Membro, quem convidou ou código do convite"
  ],
  [
    "Message limit",
    "Nachrichtenlimit",
    "Limite de mensagens"
  ],
  [
    "Message preview",
    "Nachrichtenvorschau",
    "Prévia da mensagem"
  ],
  [
    "Message published.",
    "Nachricht veröffentlicht.",
    "Mensagem publicada."
  ],
  [
    "Moderation & filters",
    "Moderation & Filter",
    "Moderação e filtros"
  ],
  [
    "Moderation log channel",
    "Moderationsprotokollkanal",
    "Canal de registro de moderação"
  ],
  [
    "Name or Discord ID",
    "Name oder Discord-ID",
    "Nome ou ID do Discord"
  ],
  [
    "Needs staff review",
    "Prüfung durch das Team erforderlich",
    "Precisa de análise da equipe"
  ],
  [
    "New messages before reposting",
    "Neue Nachrichten vor erneutem Senden",
    "Novas mensagens antes de republicar"
  ],
  [
    "New ticket category",
    "Neue Ticketkategorie",
    "Categoria de novos tickets"
  ],
  [
    "Next page",
    "Nächste Seite",
    "Próxima página"
  ],
  [
    "No Discord member linked",
    "Kein Discord-Mitglied verknüpft",
    "Nenhum membro do Discord vinculado"
  ],
  [
    "No author name or profile picture",
    "Kein Autorenname oder Profilbild",
    "Sem nome do autor nem foto de perfil"
  ],
  [
    "No custom status",
    "Kein benutzerdefinierter Status",
    "Nenhum status personalizado"
  ],
  [
    "No invite events recorded yet.",
    "Noch keine Einladungsereignisse erfasst.",
    "Nenhum evento de convite registrado ainda."
  ],
  [
    "No matching invite entries.",
    "Keine passenden Einladungseinträge.",
    "Nenhum registro de convite correspondente."
  ],
  [
    "No matching suggestions on this page.",
    "Keine passenden Vorschläge auf dieser Seite.",
    "Nenhuma sugestão correspondente nesta página."
  ],
  [
    "No moderation cases yet.",
    "Noch keine Moderationsfälle.",
    "Nenhum caso de moderação ainda."
  ],
  [
    "No note added.",
    "Keine Notiz hinzugefügt.",
    "Nenhuma observação adicionada."
  ],
  [
    "No requests yet.",
    "Noch keine Anfragen.",
    "Nenhum pedido ainda."
  ],
  [
    "No saved sample",
    "Kein gespeichertes Beispiel",
    "Nenhum exemplo salvo"
  ],
  [
    "No saved samples yet",
    "Noch keine gespeicherten Beispiele",
    "Nenhum exemplo salvo ainda"
  ],
  [
    "No staff activity recorded yet.",
    "Noch keine Teamaktivität erfasst.",
    "Nenhuma atividade da equipe registrada ainda."
  ],
  [
    "No staff match these filters.",
    "Keine Teammitglieder passen zu diesen Filtern.",
    "Nenhum membro da equipe corresponde a estes filtros."
  ],
  [
    "No status role",
    "Keine Statusrolle",
    "Nenhum cargo por status"
  ],
  [
    "No suggestions yet.",
    "Noch keine Vorschläge.",
    "Nenhuma sugestão ainda."
  ],
  [
    "Not active",
    "Nicht aktiv",
    "Inativo"
  ],
  [
    "Offline or invisible members",
    "Mitglieder mit Offline- oder Unsichtbar-Status",
    "Membros offline ou invisíveis"
  ],
  [
    "On",
    "An",
    "Ativado"
  ],
  [
    "Open creator connections",
    "Creator-Verbindungen öffnen",
    "Abrir conexões de criadores"
  ],
  [
    "Open creator sign-in page",
    "Creator-Anmeldeseite öffnen",
    "Abrir página de login do criador"
  ],
  [
    "Open current panel in Discord",
    "Aktuelles Bedienfeld in Discord öffnen",
    "Abrir painel atual no Discord"
  ],
  [
    "Open saved transcript",
    "Gespeichertes Transkript öffnen",
    "Abrir transcrição salva"
  ],
  [
    "Open tickets per member",
    "Offene Tickets pro Mitglied",
    "Tickets abertos por membro"
  ],
  [
    "Operation: ",
    "Vorgang: ",
    "Operação: "
  ],
  [
    "Options on this panel",
    "Optionen in diesem Bedienfeld",
    "Opções deste painel"
  ],
  [
    "Panel message",
    "Bedienfeldnachricht",
    "Mensagem do painel"
  ],
  [
    "Panel name",
    "Bedienfeldname",
    "Nome do painel"
  ],
  [
    "Panel preview",
    "Bedienfeldvorschau",
    "Prévia do painel"
  ],
  [
    "Panel published to Discord.",
    "Bedienfeld in Discord veröffentlicht.",
    "Painel publicado no Discord."
  ],
  [
    "Panel published. ",
    "Bedienfeld veröffentlicht. ",
    "Painel publicado. "
  ],
  [
    "Panel title",
    "Bedienfeldtitel",
    "Título do painel"
  ],
  [
    "Paused",
    "Pausiert",
    "Pausado"
  ],
  [
    "Platform account connected.",
    "Plattformkonto verbunden.",
    "Conta da plataforma conectada."
  ],
  [
    "Platform account removed.",
    "Plattformkonto entfernt.",
    "Conta da plataforma removida."
  ],
  [
    "Platform account standings",
    "Plattformkonten-Rangliste",
    "Classificação das contas das plataformas"
  ],
  [
    "Poll ended. Results are in Discord.",
    "Umfrage beendet. Ergebnisse stehen in Discord.",
    "Enquete encerrada. Os resultados estão no Discord."
  ],
  [
    "Poll published.",
    "Umfrage veröffentlicht.",
    "Enquete publicada."
  ],
  [
    "Preview event",
    "Vorschauereignis",
    "Evento da prévia"
  ],
  [
    "Preview only. No Discord message was sent.",
    "Nur Vorschau. Keine Discord-Nachricht wurde gesendet.",
    "Somente prévia. Nenhuma mensagem foi enviada ao Discord."
  ],
  [
    "Preview · save before publishing",
    "Vorschau · Vor Veröffentlichung speichern",
    "Prévia · Salve antes de publicar"
  ],
  [
    "Previous page",
    "Vorherige Seite",
    "Página anterior"
  ],
  [
    "Publish in channel",
    "Im Kanal veröffentlichen",
    "Publicar no canal"
  ],
  [
    "Publish to Discord",
    "In Discord veröffentlichen",
    "Publicar no Discord"
  ],
  [
    "Publish verification panel",
    "Verifizierungsbedienfeld veröffentlichen",
    "Publicar painel de verificação"
  ],
  [
    "Published",
    "Veröffentlicht",
    "Publicado"
  ],
  [
    "Published. ",
    "Veröffentlicht. ",
    "Publicado. "
  ],
  [
    "Questions",
    "Fragen",
    "Perguntas"
  ],
  [
    "Recent applications",
    "Neueste Bewerbungen",
    "Candidaturas recentes"
  ],
  [
    "Recent moderation cases",
    "Neueste Moderationsfälle",
    "Casos recentes de moderação"
  ],
  [
    "Recent tickets",
    "Neueste Tickets",
    "Tickets recentes"
  ],
  [
    "Refresh connection",
    "Verbindung aktualisieren",
    "Atualizar conexão"
  ],
  [
    "Refresh history",
    "Verlauf aktualisieren",
    "Atualizar histórico"
  ],
  [
    "Refresh status",
    "Status aktualisieren",
    "Atualizar status"
  ],
  [
    "Refresh totals",
    "Zähler aktualisieren",
    "Atualizar totais"
  ],
  [
    "Refresh votes",
    "Stimmen aktualisieren",
    "Atualizar votos"
  ],
  [
    "Reload appearance",
    "Erscheinungsbild neu laden",
    "Recarregar aparência"
  ],
  [
    "Reload demo appearance",
    "Demo-Erscheinungsbild neu laden",
    "Recarregar aparência da demonstração"
  ],
  [
    "Reload from Discord",
    "Aus Discord neu laden",
    "Recarregar do Discord"
  ],
  [
    "Reload the saved appearance?",
    "Gespeichertes Erscheinungsbild neu laden?",
    "Recarregar a aparência salva?"
  ],
  [
    "Remove account",
    "Konto entfernen",
    "Remover conta"
  ],
  [
    "Remove field",
    "Feld entfernen",
    "Remover campo"
  ],
  [
    "Remove panel",
    "Bedienfeld entfernen",
    "Remover painel"
  ],
  [
    "Remove this panel configuration?",
    "Diese Bedienfeldkonfiguration entfernen?",
    "Remover a configuração deste painel?"
  ],
  [
    "Remove this platform account?",
    "Dieses Plattformkonto entfernen?",
    "Remover esta conta de plataforma?"
  ],
  [
    "Remove this report category?",
    "Diese Meldungskategorie entfernen?",
    "Remover esta categoria de relatos?"
  ],
  [
    "Remove this sticky message?",
    "Diese wiederkehrende Nachricht entfernen?",
    "Remover esta mensagem fixa recorrente?"
  ],
  [
    "Report history pages",
    "Seiten des Meldungsverlaufs",
    "Páginas do histórico de relatos"
  ],
  [
    "Report intake",
    "Meldungen entgegennehmen",
    "Recebimento de relatos"
  ],
  [
    "Reports channel",
    "Meldungskanal",
    "Canal de relatos"
  ],
  [
    "Respond to this suggestion",
    "Auf diesen Vorschlag antworten",
    "Responder a esta sugestão"
  ],
  [
    "Review channel",
    "Prüfungskanal",
    "Canal de análise"
  ],
  [
    "Review tickets",
    "Tickets prüfen",
    "Revisar tickets"
  ],
  [
    "Reviewer roles",
    "Prüferrollen",
    "Cargos de avaliadores"
  ],
  [
    "Reward conversation with XP",
    "Gespräche mit XP belohnen",
    "Recompensar conversas com XP"
  ],
  [
    "Reward role",
    "Belohnungsrolle",
    "Cargo de recompensa"
  ],
  [
    "Role",
    "Rolle",
    "Cargo"
  ],
  [
    "Role activity",
    "Rollenaktivität",
    "Atividade dos cargos"
  ],
  [
    "Role on acceptance",
    "Rolle bei Annahme",
    "Cargo ao aprovar"
  ],
  [
    "Role to notify",
    "Zu benachrichtigende Rolle",
    "Cargo a notificar"
  ],
  [
    "Role to notify for uploads",
    "Bei Uploads zu benachrichtigende Rolle",
    "Cargo a notificar sobre vídeos publicados"
  ],
  [
    "Role while live",
    "Rolle während des Live-Streams",
    "Cargo durante a live"
  ],
  [
    "Roles given on join",
    "Rollen beim Beitritt",
    "Cargos dados na entrada"
  ],
  [
    "Run an invite challenge",
    "Einladungs-Challenge starten",
    "Criar desafio de convites"
  ],
  [
    "Sample activity · Demo workspace",
    "Beispielaktivität · Demo-Arbeitsbereich",
    "Atividade de exemplo · Área de demonstração"
  ],
  [
    "Sample statistics",
    "Beispielstatistik",
    "Estatísticas de exemplo"
  ],
  [
    "Save account",
    "Konto speichern",
    "Salvar conta"
  ],
  [
    "Save demo appearance",
    "Demo-Erscheinungsbild speichern",
    "Salvar aparência da demonstração"
  ],
  [
    "Save profile",
    "Profil speichern",
    "Salvar perfil"
  ],
  [
    "Save response",
    "Antwort speichern",
    "Salvar resposta"
  ],
  [
    "Save to Discord",
    "In Discord speichern",
    "Salvar no Discord"
  ],
  [
    "Saving confession settings…",
    "Geständniseinstellungen werden gespeichert…",
    "Salvando configurações de confissões…"
  ],
  [
    "Saving demo…",
    "Demo wird gespeichert…",
    "Salvando demonstração…"
  ],
  [
    "Saving settings…",
    "Einstellungen werden gespeichert…",
    "Salvando configurações…"
  ],
  [
    "Saving status role settings…",
    "Statusrolleneinstellungen werden gespeichert…",
    "Salvando configurações de cargos por status…"
  ],
  [
    "Saving suggestion settings…",
    "Vorschlagseinstellungen werden gespeichert…",
    "Salvando configurações de sugestões…"
  ],
  [
    "Saving this browser demo…",
    "Diese Browserdemo wird gespeichert…",
    "Salvando esta demonstração no navegador…"
  ],
  [
    "Saving to Discord…",
    "Wird in Discord gespeichert…",
    "Salvando no Discord…"
  ],
  [
    "Saving your response…",
    "Deine Antwort wird gespeichert…",
    "Salvando sua resposta…"
  ],
  [
    "Search invite history",
    "Einladungsverlauf durchsuchen",
    "Buscar no histórico de convites"
  ],
  [
    "Secondary text colour",
    "Sekundäre Textfarbe",
    "Cor do texto secundário"
  ],
  [
    "Select a reward role",
    "Belohnungsrolle auswählen",
    "Selecionar cargo de recompensa"
  ],
  [
    "Select a role",
    "Rolle auswählen",
    "Selecionar cargo"
  ],
  [
    "Send this link to the creator",
    "Diesen Link an den Creator senden",
    "Envie este link ao criador"
  ],
  [
    "Sending image cards",
    "Bildkarten versenden",
    "Enviando cartões de imagem"
  ],
  [
    "Server picture",
    "Server-Profilbild",
    "Foto no servidor"
  ],
  [
    "Server profile",
    "Serverprofil",
    "Perfil no servidor"
  ],
  [
    "Sessions across connected accounts",
    "Sitzungen über verbundene Konten",
    "Sessões nas contas conectadas"
  ],
  [
    "Set the right access",
    "Passenden Zugriff festlegen",
    "Defina o acesso adequado"
  ],
  [
    "Set up support tickets",
    "Support-Tickets einrichten",
    "Configurar tickets de suporte"
  ],
  [
    "Set up, save, publish",
    "Einrichten, speichern, veröffentlichen",
    "Configurar, salvar, publicar"
  ],
  [
    "Settings saved.",
    "Einstellungen gespeichert.",
    "Configurações salvas."
  ],
  [
    "Share a thought",
    "Einen Gedanken teilen",
    "Compartilhe uma ideia"
  ],
  [
    "Show background decoration",
    "Hintergrunddekoration anzeigen",
    "Mostrar decoração de fundo"
  ],
  [
    "Show divider line",
    "Trennlinie anzeigen",
    "Mostrar linha divisória"
  ],
  [
    "Show member avatar",
    "Mitgliederavatar anzeigen",
    "Mostrar avatar do membro"
  ],
  [
    "Show staff with",
    "Teammitglieder anzeigen mit",
    "Mostrar equipe com"
  ],
  [
    "Show suggestions on this page",
    "Vorschläge auf dieser Seite anzeigen",
    "Mostrar sugestões nesta página"
  ],
  [
    "Simulcasting counts on each platform",
    "Gleichzeitige Streams zählen auf jeder Plattform",
    "Transmissões simultâneas contam em cada plataforma"
  ],
  [
    "Source unavailable.",
    "Quelle nicht verfügbar.",
    "Origem indisponível."
  ],
  [
    "Staff activity table",
    "Teamaktivitätstabelle",
    "Tabela de atividade da equipe"
  ],
  [
    "Staff commands",
    "Teambefehle",
    "Comandos da equipe"
  ],
  [
    "Staff invite logger",
    "Einladungsprotokoll fürs Team",
    "Registro de convites para a equipe"
  ],
  [
    "Staff note (optional)",
    "Teamnotiz (optional)",
    "Observação da equipe (opcional)"
  ],
  [
    "Staff response",
    "Teamantwort",
    "Resposta da equipe"
  ],
  [
    "Start with a report category",
    "Mit einer Meldungskategorie beginnen",
    "Comece com uma categoria de relatos"
  ],
  [
    "Status role assignments",
    "Statusrollenzuweisungen",
    "Atribuições de cargos por status"
  ],
  [
    "Status role settings saved.",
    "Statusrolleneinstellungen gespeichert.",
    "Configurações de cargos por status salvas."
  ],
  [
    "Status roles unavailable",
    "Statusrollen nicht verfügbar",
    "Cargos por status indisponíveis"
  ],
  [
    "Status text to match",
    "Gesuchter Statustext",
    "Texto a procurar no status"
  ],
  [
    "Steps to reproduce",
    "Schritte zum Nachstellen",
    "Passos para reproduzir"
  ],
  [
    "Stream activity",
    "Stream-Aktivität",
    "Atividade de transmissão"
  ],
  [
    "Streaming platform",
    "Streamingplattform",
    "Plataforma de transmissão"
  ],
  [
    "Subtitle",
    "Untertitel",
    "Subtítulo"
  ],
  [
    "Suggestion board",
    "Vorschlagswand",
    "Mural de sugestões"
  ],
  [
    "Suggestion history pages",
    "Seiten des Vorschlagsverlaufs",
    "Páginas do histórico de sugestões"
  ],
  [
    "Suggestion response saved.",
    "Vorschlagsantwort gespeichert.",
    "Resposta à sugestão salva."
  ],
  [
    "Suggestion settings saved.",
    "Vorschlagseinstellungen gespeichert.",
    "Configurações de sugestões salvas."
  ],
  [
    "Suggestion totals",
    "Vorschlagszähler",
    "Totais de sugestões"
  ],
  [
    "Suggestions channel",
    "Vorschlagskanal",
    "Canal de sugestões"
  ],
  [
    "Suggestions unavailable",
    "Vorschläge nicht verfügbar",
    "Sugestões indisponíveis"
  ],
  [
    "Support staff roles",
    "Support-Teamrollen",
    "Cargos da equipe de suporte"
  ],
  [
    "Team activity",
    "Teamaktivität",
    "Atividade da equipe"
  ],
  [
    "Ticket categories",
    "Ticketkategorien",
    "Categorias de tickets"
  ],
  [
    "Tickets closed",
    "Tickets geschlossen",
    "Tickets encerrados"
  ],
  [
    "TikTok connection",
    "TikTok-Verbindung",
    "Conexão com o TikTok"
  ],
  [
    "Time between confessions (seconds)",
    "Zeit zwischen Geständnissen (Sekunden)",
    "Intervalo entre confissões (segundos)"
  ],
  [
    "Time between reports (minutes)",
    "Zeit zwischen Meldungen (Minuten)",
    "Intervalo entre relatos (minutos)"
  ],
  [
    "Time between suggestions (minutes)",
    "Zeit zwischen Vorschlägen (Minuten)",
    "Intervalo entre sugestões (minutos)"
  ],
  [
    "Time window (seconds)",
    "Zeitfenster (Sekunden)",
    "Janela de tempo (segundos)"
  ],
  [
    "Timeout length (minutes)",
    "Timeout-Dauer (Minuten)",
    "Duração do castigo (minutos)"
  ],
  [
    "Title filter",
    "Titelfilter",
    "Filtro de título"
  ],
  [
    "Title, category, or reporter",
    "Titel, Kategorie oder meldende Person",
    "Título, categoria ou autor do relato"
  ],
  [
    "Tools for your moderators",
    "Werkzeuge für dein Moderationsteam",
    "Ferramentas para seus moderadores"
  ],
  [
    "Tracked account time",
    "Erfasste Kontozeit",
    "Tempo registrado da conta"
  ],
  [
    "Transcript channel",
    "Transkriptkanal",
    "Canal de transcrições"
  ],
  [
    "Try a sample custom status",
    "Beispielstatus ausprobieren",
    "Teste um status personalizado de exemplo"
  ],
  [
    "Try your rule",
    "Deine Regel testen",
    "Teste sua regra"
  ],
  [
    "Unavailable",
    "Nicht verfügbar",
    "Indisponível"
  ],
  [
    "Unconfirmed",
    "Unbestätigt",
    "Não confirmado"
  ],
  [
    "Unconfirmed — check channel",
    "Unbestätigt — Kanal prüfen",
    "Não confirmado — confira o canal"
  ],
  [
    "Unknown",
    "Unbekannt",
    "Desconhecido"
  ],
  [
    "Untitled panel",
    "Unbenanntes Bedienfeld",
    "Painel sem título"
  ],
  [
    "Updating report…",
    "Meldung wird aktualisiert…",
    "Atualizando relato…"
  ],
  [
    "Updating this server’s bot appearance…",
    "Bot-Erscheinungsbild für diesen Server wird aktualisiert…",
    "Atualizando a aparência do bot neste servidor…"
  ],
  [
    "Upload announcement channel",
    "Kanal für Videoankündigungen",
    "Canal de anúncios de vídeos"
  ],
  [
    "Upload announcement message",
    "Nachricht für Videoankündigungen",
    "Mensagem de anúncio de vídeo"
  ],
  [
    "Uploaded video alerts",
    "Benachrichtigungen für hochgeladene Videos",
    "Alertas de vídeos publicados"
  ],
  [
    "Uploaded videos",
    "Hochgeladene Videos",
    "Vídeos publicados"
  ],
  [
    "Use default name",
    "Standardnamen verwenden",
    "Usar nome padrão"
  ],
  [
    "Use default picture",
    "Standardbild verwenden",
    "Usar foto padrão"
  ],
  [
    "Verification channel",
    "Verifizierungskanal",
    "Canal de verificação"
  ],
  [
    "Verification panel published.",
    "Verifizierungsbedienfeld veröffentlicht.",
    "Painel de verificação publicado."
  ],
  [
    "Verification panel published. ",
    "Verifizierungsbedienfeld veröffentlicht. ",
    "Painel de verificação publicado. "
  ],
  [
    "Verification settings",
    "Verifizierungseinstellungen",
    "Configurações de verificação"
  ],
  [
    "Verified member role",
    "Rolle für verifizierte Mitglieder",
    "Cargo de membro verificado"
  ],
  [
    "Video title filter",
    "Videotitelfilter",
    "Filtro de título do vídeo"
  ],
  [
    "View streamer leaderboard",
    "Streamer-Rangliste ansehen",
    "Ver ranking de streamers"
  ],
  [
    "Votes",
    "Stimmen",
    "Votos"
  ],
  [
    "Wait before reposting (seconds)",
    "Wartezeit bis zum erneuten Senden (Sekunden)",
    "Espera antes de republicar (segundos)"
  ],
  [
    "Welcome message",
    "Begrüßungsnachricht",
    "Mensagem de boas-vindas"
  ],
  [
    "What members see",
    "Was Mitglieder sehen",
    "O que os membros veem"
  ],
  [
    "What the log shows",
    "Was das Protokoll zeigt",
    "O que o registro mostra"
  ],
  [
    "What these numbers mean",
    "Was diese Zahlen bedeuten",
    "O que esses números significam"
  ],
  [
    "When the source is unknown",
    "Wenn die Quelle unbekannt ist",
    "Quando a origem é desconhecida"
  ],
  [
    "When the stream ends",
    "Wenn der Stream endet",
    "Quando a transmissão termina"
  ],
  [
    "When their status is hidden",
    "Wenn ihr Status verborgen ist",
    "Quando o status estiver oculto"
  ],
  [
    "With activity in this period",
    "Mit Aktivität in diesem Zeitraum",
    "Com atividade neste período"
  ],
  [
    "With recorded actions in this period",
    "Mit erfassten Aktionen in diesem Zeitraum",
    "Com ações registradas neste período"
  ],
  [
    "Your changes are a preview until you save.",
    "Deine Änderungen bleiben eine Vorschau, bis du sie speicherst.",
    "Suas alterações são apenas uma prévia até você salvar."
  ],
  [
    "Your channels, your choice",
    "Deine Kanäle, deine Entscheidung",
    "Seus canais, sua escolha"
  ],
  [
    "Your community, made yours.",
    "Deine Community nach deinen Vorstellungen.",
    "Sua comunidade do seu jeito."
  ],
  [
    "Your community’s status reward",
    "Die Statusbelohnung deiner Community",
    "A recompensa por status da sua comunidade"
  ],
  [
    "Your creators",
    "Deine Creator",
    "Seus criadores"
  ],
  [
    "Your dashboard is ready.",
    "Dein Dashboard ist bereit.",
    "Seu painel está pronto."
  ],
  [
    "Your panel message",
    "Deine Bedienfeldnachricht",
    "Sua mensagem do painel"
  ],
  [
    "Your poll question",
    "Deine Umfragefrage",
    "Sua pergunta da enquete"
  ],
  [
    "Your verification message",
    "Deine Verifizierungsnachricht",
    "Sua mensagem de verificação"
  ],
  [
    "applications",
    "Bewerbungen",
    "candidaturas"
  ],
  [
    "by Headache Development",
    "von Headache Development",
    "por Headache Development"
  ]
];
  return Object.freeze({ de: Object.freeze(Object.fromEntries(rows.map(([key, de]) => [key, de]))), pt: Object.freeze(Object.fromEntries(rows.map(([key, , pt]) => [key, pt]))) });
})();
