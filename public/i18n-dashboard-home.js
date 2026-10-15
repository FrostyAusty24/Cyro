'use strict';
// Public product copy uses the same local language preference as the dashboard.
(() => {
  const rows = [
  [
    "A room for every conversation.",
    "Un salon pour chaque conversation.",
    "Una sala para cada conversación.",
    "Ein Raum für jedes Gespräch.",
    "Uma sala para cada conversa."
  ],
  [
    "Join your server’s “Join to create” channel to get a room. Cyro removes it when everyone leaves.",
    "Rejoignez le salon de création de votre serveur pour obtenir une salle. Cyro la supprime quand tout le monde part.",
    "Entra al canal de creación del servidor para obtener una sala. Cyro la elimina cuando todos salen.",
    "Betritt den Erstellungskanal deines Servers, um einen Raum zu erhalten. Cyro entfernt ihn, wenn alle gehen.",
    "Entre no canal de criação do servidor para obter uma sala. Cyro a remove quando todos saem."
  ],
  [
    "Open the room’s chat for buttons to lock, unlock, rename and set its member limit.",
    "Ouvrez le chat du salon pour le verrouiller, le déverrouiller, le renommer ou limiter le nombre de membres.",
    "Abre el chat de la sala para bloquearla, desbloquearla, renombrarla o limitar sus miembros.",
    "Öffne den Raumchat für Buttons zum Sperren, Entsperren, Umbenennen und Festlegen der Teilnehmergrenze.",
    "Abra o chat da sala para bloquear, desbloquear, renomear e definir o limite de membros."
  ],
  [
    "Allow member lets someone into a locked room. Remove member disconnects someone; it does not ban them or stop them rejoining.",
    "Autoriser un membre donne accès à un salon verrouillé. Retirer un membre le déconnecte sans le bannir ni l’empêcher de revenir.",
    "Permitir miembro da acceso a una sala bloqueada. Retirar miembro lo desconecta; no lo bloquea ni impide que vuelva.",
    "Mitglied zulassen gewährt Zutritt zu einem gesperrten Raum. Mitglied entfernen trennt die Verbindung, ohne die Person zu bannen oder am Wiederbeitritt zu hindern.",
    "Permitir membro dá acesso à sala bloqueada. Remover membro desconecta a pessoa; não bane nem impede que volte."
  ],
  [
    "Bug reports & sticky messages",
    "Signalements de bugs et messages persistants",
    "Reportes de errores y mensajes persistentes",
    "Fehlermeldungen und angeheftete Hinweise",
    "Relatos de bugs e mensagens persistentes"
  ],
  [
    "Keep problems and useful information in view.",
    "Gardez les problèmes et les informations utiles en vue.",
    "Mantén visibles los problemas y la información útil.",
    "Behalte Probleme und hilfreiche Informationen im Blick.",
    "Mantenha problemas e informações úteis à vista."
  ],
  [
    "Use /bugreport for bot or server problems in a category your admins choose. Reports show the author’s Discord name.",
    "Utilisez /bugreport pour signaler un problème du bot ou du serveur dans une catégorie définie par les administrateurs. Le nom Discord de l’auteur est affiché.",
    "Usa /bugreport para problemas del bot o del servidor en una categoría elegida por los administradores. Los reportes muestran el nombre de Discord del autor.",
    "Verwende /bugreport für Bot- oder Serverprobleme in einer von Admins gewählten Kategorie. Meldungen zeigen den Discord-Namen des Verfassers.",
    "Use /bugreport para problemas do bot ou servidor em uma categoria escolhida pelos administradores. Os relatos mostram o nome do autor no Discord."
  ],
  [
    "Staff can mark reports Open, In progress, Resolved or Dismissed from the dashboard.",
    "L’équipe peut marquer les signalements Ouvert, En cours, Résolu ou Rejeté depuis le tableau de bord.",
    "El equipo puede marcar reportes como Abierto, En curso, Resuelto o Descartado desde el panel.",
    "Das Team kann Meldungen im Dashboard als Offen, In Bearbeitung, Gelöst oder Verworfen markieren.",
    "A equipe pode marcar relatos como Aberto, Em andamento, Resolvido ou Descartado pelo painel."
  ],
  [
    "Sticky reminders repost after your chosen message count and delay, removing Cyro’s previous reminder.",
    "Les rappels persistants sont republiés après le nombre de messages et le délai choisis, en supprimant le rappel précédent de Cyro.",
    "Los recordatorios persistentes se publican tras la cantidad de mensajes y el intervalo elegidos, eliminando el recordatorio anterior de Cyro.",
    "Hinweise werden nach der gewählten Nachrichtenanzahl und Wartezeit erneut gesendet. Cyros vorheriger Hinweis wird entfernt.",
    "Os lembretes persistentes são reenviados após a quantidade de mensagens e o intervalo escolhidos, removendo o lembrete anterior do Cyro."
  ],
  [
    "More staff tools",
    "Plus d’outils pour l’équipe",
    "Más herramientas para el equipo",
    "Mehr Werkzeuge fürs Team",
    "Mais ferramentas para a equipe"
  ],
  [
    "Creator alerts & leaderboards",
    "Alertes et classements des créateurs",
    "Alertas y clasificaciones de creadores",
    "Creator-Benachrichtigungen und Ranglisten",
    "Alertas e rankings de criadores"
  ],
  [
    "One creator, all their accounts.",
    "Un créateur, tous ses comptes.",
    "Un creador, todas sus cuentas.",
    "Ein Creator, alle seine Konten.",
    "Um criador, todas as suas contas."
  ],
  [
    "Bring Twitch, Kick, YouTube and TikTok accounts together and link them to a Discord member.",
    "Regroupez les comptes Twitch, Kick, YouTube et TikTok et associez-les à un membre Discord.",
    "Agrupa cuentas de Twitch, Kick, YouTube y TikTok y vincúlalas a un miembro de Discord.",
    "Fasse Twitch-, Kick-, YouTube- und TikTok-Konten zusammen und verknüpfe sie mit einem Discord-Mitglied.",
    "Agrupe contas do Twitch, Kick, YouTube e TikTok e vincule a um membro do Discord."
  ],
  [
    "Choose channels, messages and title filters for live alerts and supported video uploads.",
    "Choisissez les salons, messages et filtres de titre pour les directs et les vidéos publiées prises en charge.",
    "Elige canales, mensajes y filtros de título para directos y vídeos publicados compatibles.",
    "Wähle Kanäle, Nachrichten und Titelfilter für Live-Benachrichtigungen und unterstützte Videoveröffentlichungen.",
    "Escolha canais, mensagens e filtros de título para alertas ao vivo e vídeos publicados compatíveis."
  ],
  [
    "Track time streamed while Cyro’s announcement is active, with viewer and follower statistics where available.",
    "Suivez la durée de diffusion pendant que l’annonce de Cyro est active, avec les statistiques de spectateurs et d’abonnés disponibles.",
    "Registra el tiempo en directo mientras el aviso de Cyro está activo, con estadísticas de espectadores y seguidores cuando estén disponibles.",
    "Erfasse Streamzeit, während Cyros Ankündigung aktiv ist, mit Zuschauer- und Followerstatistiken, soweit verfügbar.",
    "Registre o tempo transmitido enquanto o aviso do Cyro estiver ativo, com estatísticas de espectadores e seguidores quando disponíveis."
  ],
  [
    "Moderation & verification",
    "Modération et vérification",
    "Moderación y verificación",
    "Moderation und Verifizierung",
    "Moderação e verificação"
  ],
  [
    "Give your staff a helping hand.",
    "Donnez un coup de main à votre équipe.",
    "Dale una mano a tu equipo.",
    "Unterstütze dein Team.",
    "Dê uma ajuda à sua equipe."
  ],
  [
    "Warnings, timeouts, kicks, bans, message cleanup and moderation records.",
    "Avertissements, exclusions temporaires, expulsions, bannissements, nettoyage des messages et journaux de modération.",
    "Advertencias, aislamientos, expulsiones, bloqueos, limpieza de mensajes y registros de moderación.",
    "Verwarnungen, Timeouts, Ausschlüsse, Banns, Nachrichtenbereinigung und Moderationsprotokolle.",
    "Advertências, castigos, expulsões, banimentos, limpeza de mensagens e registros de moderação."
  ],
  [
    "Blocked-word filters and configurable spam controls.",
    "Filtres de mots bloqués et protection antispam configurable.",
    "Filtros de palabras bloqueadas y controles de spam configurables.",
    "Wortfilter und konfigurierbare Spamkontrollen.",
    "Filtros de palavras bloqueadas e controles de spam configuráveis."
  ],
  [
    "Let members verify with a reaction or a private image challenge to receive a role.",
    "Les membres peuvent se vérifier par réaction ou défi d’image privé pour recevoir un rôle.",
    "Permite verificarse con una reacción o un desafío de imagen privado para obtener un rol.",
    "Mitglieder können sich per Reaktion oder privater Bildaufgabe verifizieren und eine Rolle erhalten.",
    "Permita a verificação por reação ou desafio de imagem privado para receber um cargo."
  ],
  [
    "Welcomes & member roles",
    "Accueil et rôles des membres",
    "Bienvenidas y roles de miembros",
    "Begrüßungen und Mitgliederrollen",
    "Boas-vindas e cargos de membros"
  ],
  [
    "Make the first hello your own.",
    "Personnalisez le premier bonjour.",
    "Personaliza el primer saludo.",
    "Gestalte das erste Hallo selbst.",
    "Personalize o primeiro olá."
  ],
  [
    "Custom welcome and goodbye messages or image cards, with editable wording, colours and an optional accent bar.",
    "Messages ou cartes d’accueil et de départ personnalisés, avec textes, couleurs et barre d’accent facultative modifiables.",
    "Mensajes o tarjetas de bienvenida y despedida con textos, colores y barra decorativa opcional editables.",
    "Eigene Begrüßungs- und Abschiedsnachrichten oder Bildkarten mit anpassbaren Texten, Farben und optionalem Akzentbalken.",
    "Mensagens ou cartões de boas-vindas e despedida com textos, cores e barra de destaque opcional editáveis."
  ],
  [
    "Automatic welcome roles and self-selected role menus.",
    "Rôles d’accueil automatiques et menus de rôles au choix.",
    "Roles de bienvenida automáticos y menús de roles autoasignables.",
    "Automatische Begrüßungsrollen und Menüs zur eigenen Rollenwahl.",
    "Cargos automáticos de boas-vindas e menus de cargos autoatribuíveis."
  ],
  [
    "Give a dedicated role for matching custom status text, and remove it when the match ends.",
    "Attribuez un rôle lorsque le statut personnalisé correspond au texte choisi, puis retirez-le quand ce n’est plus le cas.",
    "Da un rol cuando el estado personalizado coincida con el texto elegido y retíralo cuando deje de coincidir.",
    "Vergib eine Rolle bei passendem Statustext und entferne sie, sobald er nicht mehr übereinstimmt.",
    "Atribua um cargo quando o status personalizado corresponder ao texto escolhido e remova quando deixar de corresponder."
  ],
  [
    "Tickets, applications & staff",
    "Tickets, candidatures et équipe",
    "Tickets, solicitudes y equipo",
    "Tickets, Bewerbungen und Team",
    "Tickets, inscrições e equipe"
  ],
  [
    "Keep support organised.",
    "Gardez une assistance organisée.",
    "Mantén el soporte organizado.",
    "Halte den Support organisiert.",
    "Mantenha o suporte organizado."
  ],
  [
    "Multiple ticket categories and application forms, with buttons or dropdowns.",
    "Plusieurs catégories de tickets et formulaires de candidature, avec boutons ou menus déroulants.",
    "Varias categorías de tickets y formularios de solicitud, con botones o desplegables.",
    "Mehrere Ticketkategorien und Bewerbungsformulare mit Buttons oder Auswahlmenüs.",
    "Várias categorias de tickets e formulários de inscrição, com botões ou menus suspensos."
  ],
  [
    "Staff claims, application reviews and saved ticket transcripts before optional channel deletion.",
    "Prise en charge par l’équipe, examen des candidatures et transcriptions sauvegardées avant suppression facultative du salon.",
    "Asignación al equipo, revisión de solicitudes y transcripciones guardadas antes de la eliminación opcional del canal.",
    "Ticketübernahmen, Bewerbungsprüfungen und gespeicherte Transkripte vor optionaler Kanallöschung.",
    "Tickets assumidos pela equipe, avaliações de inscrições e transcrições salvas antes da exclusão opcional do canal."
  ],
  [
    "Search and filter staff leaderboards across tickets, moderation and application reviews, with ticket claim and closure times and current workload.",
    "Recherchez et filtrez les classements de l’équipe pour les tickets, la modération et les candidatures, avec durées de prise en charge, de fermeture et charge actuelle.",
    "Busca y filtra clasificaciones del equipo por tickets, moderación y solicitudes, con tiempos de asignación y cierre y carga actual.",
    "Durchsuche und filtere Teamranglisten für Tickets, Moderation und Bewerbungen mit Übernahme- und Abschlusszeiten sowie aktueller Auslastung.",
    "Busque e filtre rankings da equipe por tickets, moderação e inscrições, com tempos de atendimento e fechamento e carga atual."
  ],
  [
    "Counting, invites & levels",
    "Comptage, invitations et niveaux",
    "Contar, invitaciones y niveles",
    "Zählen, Einladungen und Level",
    "Contagem, convites e níveis"
  ],
  [
    "Give people a reason to join in.",
    "Donnez envie de participer.",
    "Dale a la gente un motivo para participar.",
    "Gib Leuten einen Grund mitzumachen.",
    "Dê às pessoas um motivo para participar."
  ],
  [
    "A shared counting game with correct-number reactions and a server best streak.",
    "Un jeu de comptage collectif avec réactions aux bons nombres et record du serveur.",
    "Un juego compartido de contar con reacciones a números correctos y récord del servidor.",
    "Ein gemeinsames Zählspiel mit Reaktionen auf richtige Zahlen und Serverrekord.",
    "Um jogo coletivo de contagem com reações aos números corretos e recorde do servidor."
  ],
  [
    "Chat XP, levels and invite challenges with leaderboards.",
    "XP de discussion, niveaux et défis d’invitations avec classements.",
    "XP del chat, niveles y retos de invitaciones con clasificaciones.",
    "Chat-XP, Level und Einladungsherausforderungen mit Ranglisten.",
    "XP de conversa, níveis e desafios de convites com rankings."
  ],
  [
    "Optional staff logs for joins, departures and known invite sources, even outside a challenge.",
    "Journaux facultatifs des arrivées, départs et sources d’invitation connues, même sans défi.",
    "Registros opcionales de entradas, salidas y fuentes de invitación conocidas, incluso sin reto.",
    "Optionale Teamprotokolle für Beitritte, Austritte und bekannte Einladungsquellen, auch ohne Herausforderung.",
    "Registros opcionais para a equipe de entradas, saídas e origens conhecidas de convites, mesmo sem desafio."
  ],
  [
    "Messages, polls & suggestions",
    "Messages, sondages et suggestions",
    "Mensajes, encuestas y sugerencias",
    "Nachrichten, Umfragen und Vorschläge",
    "Mensagens, enquetes e sugestões"
  ],
  [
    "Let the community have a say.",
    "Donnez la parole à la communauté.",
    "Dale voz a la comunidad.",
    "Lass die Community mitreden.",
    "Dê voz à comunidade."
  ],
  [
    "Compose rich embeds for your channels and create native Discord polls.",
    "Créez des messages intégrés enrichis et des sondages Discord natifs.",
    "Redacta mensajes enriquecidos y crea encuestas nativas de Discord.",
    "Erstelle ansprechende Embeds und native Discord-Umfragen.",
    "Crie mensagens incorporadas e enquetes nativas do Discord."
  ],
  [
    "Members use /suggestion to post ideas for others to vote on.",
    "Les membres utilisent /suggestion pour publier des idées soumises au vote.",
    "Los miembros usan /suggestion para publicar ideas que otros pueden votar.",
    "Mitglieder posten mit /suggestion Ideen, über die andere abstimmen können.",
    "Os membros usam /suggestion para publicar ideias que outros podem votar."
  ],
  [
    "Staff can accept, decline or close suggestions with a public response.",
    "L’équipe peut accepter, refuser ou fermer les suggestions avec une réponse publique.",
    "El equipo puede aceptar, rechazar o cerrar sugerencias con una respuesta pública.",
    "Das Team kann Vorschläge mit öffentlicher Antwort annehmen, ablehnen oder schließen.",
    "A equipe pode aceitar, recusar ou encerrar sugestões com uma resposta pública."
  ],
  [
    "Music & text to speech",
    "Musique et synthèse vocale",
    "Música y texto a voz",
    "Musik und Sprachausgabe",
    "Música e texto em voz"
  ],
  [
    "Something for the voice lounge.",
    "De quoi animer le salon vocal.",
    "Algo para la sala de voz.",
    "Etwas für die Sprachlounge.",
    "Algo para a sala de voz."
  ],
  [
    "Use /playmusic to queue supported music links in your current voice call.",
    "Utilisez /playmusic pour ajouter des liens musicaux compatibles à la file de votre appel vocal.",
    "Usa /playmusic para poner enlaces musicales compatibles en la cola de tu llamada.",
    "Stelle mit /playmusic unterstützte Musiklinks in die Warteschlange deines Sprachanrufs.",
    "Use /playmusic para adicionar links de música compatíveis à fila da sua chamada."
  ],
  [
    "Use /addtts to read new messages from people in that call’s chat. Optionally announce the speaker’s name before each message.",
    "Utilisez /addtts pour lire les nouveaux messages des participants dans le chat de l’appel. Le nom peut être annoncé avant chaque message.",
    "Usa /addtts para leer los mensajes nuevos de participantes en el chat de la llamada. Opcionalmente anuncia el nombre antes de cada mensaje.",
    "Lies mit /addtts neue Chatnachrichten der Anrufteilnehmer vor. Optional wird vor jeder Nachricht der Name genannt.",
    "Use /addtts para ler as novas mensagens dos participantes no chat da chamada. Opcionalmente anuncie o nome antes de cada mensagem."
  ],
  [
    "Search free voices by name or language with /ttsvoice: English, French, Spanish, German, Brazilian Portuguese, Italian and Hindi. Available voices run on Cyro’s host.",
    "Recherchez des voix gratuites par nom ou langue avec /ttsvoice : anglais, français, espagnol, allemand, portugais brésilien, italien et hindi. Les voix fonctionnent sur l’hébergement de Cyro.",
    "Busca voces gratuitas por nombre o idioma con /ttsvoice: inglés, francés, español, alemán, portugués brasileño, italiano e hindi. Las voces funcionan en el servidor de Cyro.",
    "Suche kostenlose Stimmen mit /ttsvoice nach Namen oder Sprache: Englisch, Französisch, Spanisch, Deutsch, brasilianisches Portugiesisch, Italienisch und Hindi. Stimmen laufen auf Cyros Host.",
    "Busque vozes gratuitas por nome ou idioma com /ttsvoice: inglês, francês, espanhol, alemão, português brasileiro, italiano e hindi. As vozes rodam no servidor do Cyro."
  ],
  [
    "Confessions & server personality",
    "Confessions et identité du serveur",
    "Confesiones y personalidad del servidor",
    "Geständnisse und Serverpersönlichkeit",
    "Confissões e personalidade do servidor"
  ],
  [
    "A space that feels like yours.",
    "Un espace à votre image.",
    "Un espacio que se sienta tuyo.",
    "Ein Ort, der sich nach dir anfühlt.",
    "Um espaço com a sua cara."
  ],
  [
    "Send /confess submissions to a chosen channel as numbered posts without public author names.",
    "Envoyez les confessions /confess dans le salon choisi sous forme de publications numérotées sans nom d’auteur public.",
    "Envía las confesiones de /confess al canal elegido como publicaciones numeradas sin autor público.",
    "Sende /confess-Beiträge als nummerierte Posts ohne öffentlichen Autorennamen in einen gewählten Kanal.",
    "Envie confissões de /confess ao canal escolhido como publicações numeradas sem nome público do autor."
  ],
  [
    "Personalise Cyro’s nickname and picture separately in each server.",
    "Personnalisez le surnom et l’image de Cyro séparément pour chaque serveur.",
    "Personaliza el apodo y la imagen de Cyro por separado en cada servidor.",
    "Passe Cyros Spitznamen und Bild für jeden Server getrennt an.",
    "Personalize o apelido e a imagem do Cyro separadamente em cada servidor."
  ],
  [
    "Owners choose dashboard access roles and command restrictions. Each server keeps its own settings.",
    "Les propriétaires choisissent les rôles d’accès au tableau de bord et les restrictions des commandes. Chaque serveur garde ses propres paramètres.",
    "Los propietarios eligen los roles de acceso al panel y las restricciones de comandos. Cada servidor mantiene sus ajustes.",
    "Inhaber wählen Dashboard-Zugriffsrollen und Befehlsbeschränkungen. Jeder Server behält eigene Einstellungen.",
    "Os donos escolhem cargos de acesso ao painel e restrições de comandos. Cada servidor mantém suas próprias configurações."
  ],
  [
    "Cyro home",
    "Accueil de Cyro",
    "Inicio de Cyro",
    "Cyro-Startseite",
    "Início do Cyro"
  ],
  [
    "Your community bot",
    "Le bot de votre communauté",
    "El bot de tu comunidad",
    "Dein Community-Bot",
    "O bot da sua comunidade"
  ],
  [
    "Discord servers connected",
    "Serveurs Discord connectés",
    "Servidores de Discord conectados",
    "Verbundene Discord-Server",
    "Servidores do Discord conectados"
  ],
  [
    "Discord server connected",
    "Serveur Discord connecté",
    "Servidor de Discord conectado",
    "Verbundener Discord-Server",
    "Servidor do Discord conectado"
  ],
  [
    "Checking the live count…",
    "Vérification du total en direct…",
    "Consultando el total en vivo…",
    "Live-Anzahl wird geprüft…",
    "Verificando o total ao vivo…"
  ],
  [
    "Headache Development Discord",
    "Discord de Headache Development",
    "Discord de Headache Development",
    "Headache Development Discord",
    "Discord da Headache Development"
  ],
  [
    "Main navigation",
    "Navigation principale",
    "Navegación principal",
    "Hauptnavigation",
    "Navegação principal"
  ],
  [
    "Features",
    "Fonctionnalités",
    "Funciones",
    "Funktionen",
    "Recursos"
  ],
  [
    "Free to use",
    "Utilisation gratuite",
    "Uso gratuito",
    "Kostenlos nutzbar",
    "Uso gratuito"
  ],
  [
    "A little more connected",
    "Un peu plus proches",
    "Un poco más conectados",
    "Ein bisschen mehr verbunden",
    "Um pouco mais conectados"
  ],
  [
    "Your community.",
    "Votre communauté.",
    "Tu comunidad.",
    "Deine Community.",
    "Sua comunidade."
  ],
  [
    "In good hands.",
    "Entre de bonnes mains.",
    "En buenas manos.",
    "In guten Händen.",
    "Em boas mãos."
  ],
  [
    "Celebrate your creators, welcome new faces and keep the conversation going. From temporary voice rooms to staff tools, Cyro brings your Discord community together.",
    "Mettez vos créateurs à l’honneur, accueillez les nouveaux et entretenez les échanges. Des salons vocaux temporaires aux outils d’équipe, Cyro rassemble votre communauté Discord.",
    "Celebra a tus creadores, recibe nuevas caras y mantén la conversación. Desde salas de voz temporales hasta herramientas del equipo, Cyro une a tu comunidad de Discord.",
    "Feiere deine Creator, begrüße neue Gesichter und halte Gespräche am Laufen. Von temporären Sprachräumen bis zu Teamwerkzeugen bringt Cyro deine Discord-Community zusammen.",
    "Valorize seus criadores, receba novos rostos e mantenha a conversa. De salas de voz temporárias a ferramentas da equipe, Cyro une sua comunidade do Discord."
  ],
  [
    "Explore the dashboard",
    "Explorer le tableau de bord",
    "Explorar el panel",
    "Dashboard erkunden",
    "Explorar o painel"
  ],
  [
    "Free to use. Hosted for you. Set up in your browser.",
    "Gratuit. Hébergé pour vous. Configurable dans votre navigateur.",
    "Gratis. Alojado por nosotros. Se configura en el navegador.",
    "Kostenlos. Für dich gehostet. Im Browser eingerichtet.",
    "Gratuito. Hospedado para você. Configure no navegador."
  ],
  [
    "Dashboard sign-in is not configured on this host yet. You can still explore the demo.",
    "La connexion au tableau de bord n’est pas encore configurée sur cet hébergement. Vous pouvez explorer la démo.",
    "El inicio de sesión del panel aún no está configurado en este servidor. Puedes explorar la demo.",
    "Die Dashboard-Anmeldung ist auf diesem Host noch nicht eingerichtet. Du kannst die Demo erkunden.",
    "O login do painel ainda não está configurado nesta hospedagem. Você pode explorar a demonstração."
  ],
  [
    "Cyro icy blue C logo",
    "Logo C bleu glacé de Cyro",
    "Logo C azul hielo de Cyro",
    "Cyros eisblaues C-Logo",
    "Logo C azul-gelo do Cyro"
  ],
  [
    "One dashboard, all your servers",
    "Un tableau de bord, tous vos serveurs",
    "Un panel, todos tus servidores",
    "Ein Dashboard, alle deine Server",
    "Um painel, todos os seus servidores"
  ],
  [
    "Access controlled by your server owner",
    "Accès contrôlé par le propriétaire du serveur",
    "Acceso controlado por el propietario del servidor",
    "Zugriff durch den Serverinhaber geregelt",
    "Acesso controlado pelo dono do servidor"
  ],
  [
    "Features you can make your own",
    "Des fonctionnalités à personnaliser",
    "Funciones que puedes personalizar",
    "Funktionen nach deinen Wünschen",
    "Recursos que você pode personalizar"
  ],
  [
    "What’s included",
    "Ce qui est inclus",
    "Qué incluye",
    "Was enthalten ist",
    "O que está incluído"
  ],
  [
    "For the people who make your server.",
    "Pour les personnes qui font vivre votre serveur.",
    "Para quienes dan vida a tu servidor.",
    "Für die Menschen, die deinen Server ausmachen.",
    "Para as pessoas que dão vida ao servidor."
  ],
  [
    "A place to hang out, tools for your staff and ways to keep everyone involved. Choose what your server needs and set it up in the dashboard.",
    "Un lieu pour discuter, des outils pour votre équipe et des moyens de faire participer chacun. Choisissez ce dont votre serveur a besoin et configurez-le dans le tableau de bord.",
    "Un lugar para reunirse, herramientas para el equipo y formas de involucrar a todos. Elige lo que necesita tu servidor y configúralo en el panel.",
    "Ein Ort zum Zusammensein, Werkzeuge fürs Team und Möglichkeiten für alle mitzumachen. Wähle die Bedürfnisse deines Servers und richte sie im Dashboard ein.",
    "Um lugar para conversar, ferramentas para a equipe e formas de envolver todos. Escolha o que seu servidor precisa e configure no painel."
  ],
  [
    "Platform features vary. TikTok connections need approved access and creator consent; TikTok LIVE is best effort. Music link support depends on the source and host; Spotify full-track playback is unavailable. ",
    "Les fonctionnalités varient selon la plateforme. TikTok nécessite un accès approuvé et le consentement du créateur ; TikTok LIVE n’est pas garanti. Les liens musicaux dépendent de la source et de l’hébergement ; les morceaux Spotify complets ne sont pas disponibles. ",
    "Las funciones varían según la plataforma. TikTok requiere acceso aprobado y consentimiento del creador; TikTok LIVE no está garantizado. Los enlaces musicales dependen de la fuente y el alojamiento; no hay reproducción completa de Spotify. ",
    "Plattformfunktionen unterscheiden sich. TikTok benötigt genehmigten Zugriff und Creator-Zustimmung; TikTok LIVE funktioniert ohne Garantie. Musiklinks hängen von Quelle und Host ab; vollständige Spotify-Titel sind nicht verfügbar. ",
    "Os recursos variam por plataforma. TikTok exige acesso aprovado e consentimento do criador; TikTok LIVE não é garantido. Links de música dependem da fonte e hospedagem; reprodução completa do Spotify não está disponível. "
  ],
  [
    "More below.",
    "Plus d’informations ci-dessous.",
    "Más información abajo.",
    "Mehr dazu unten.",
    "Mais informações abaixo."
  ],
  [
    "Our approach",
    "Notre approche",
    "Nuestro enfoque",
    "Unser Ansatz",
    "Nossa proposta"
  ],
  [
    "Free to use.",
    "Gratuit.",
    "Uso gratuito.",
    "Kostenlos nutzbar.",
    "Uso gratuito."
  ],
  [
    "That’s the plan.",
    "C’est notre intention.",
    "Ese es el plan.",
    "Das ist der Plan.",
    "Esse é o plano."
  ],
  [
    "All current Cyro features are free.",
    "Toutes les fonctionnalités actuelles de Cyro sont gratuites.",
    "Todas las funciones actuales de Cyro son gratuitas.",
    "Alle aktuellen Cyro-Funktionen sind kostenlos.",
    "Todos os recursos atuais do Cyro são gratuitos."
  ],
  [
    "We plan to keep it that way. We’d only consider paid options if hosting costs became too expensive to sustain.",
    "Nous comptons continuer ainsi. Nous n’envisagerions des options payantes que si les frais d’hébergement devenaient trop élevés pour être supportés.",
    "Queremos mantenerlo así. Solo consideraríamos opciones de pago si los costes de alojamiento fueran demasiado elevados para sostenerlos.",
    "Das soll so bleiben. Kostenpflichtige Optionen kämen nur infrage, wenn die Hostingkosten nicht mehr tragbar wären.",
    "Pretendemos manter assim. Só consideraríamos opções pagas se os custos de hospedagem ficassem altos demais para sustentar."
  ],
  [
    "Headache Development · The people behind Cyro",
    "Headache Development · L’équipe derrière Cyro",
    "Headache Development · El equipo detrás de Cyro",
    "Headache Development · Das Team hinter Cyro",
    "Headache Development · A equipe por trás do Cyro"
  ],
  [
    "Your community, set up your way.",
    "Votre communauté, à votre façon.",
    "Tu comunidad, a tu manera.",
    "Deine Community, nach deinen Wünschen.",
    "Sua comunidade, do seu jeito."
  ],
  [
    "Cyro runs on our hosting. You don’t need to keep your computer on.",
    "Cyro fonctionne sur notre hébergement. Vous n’avez pas besoin de laisser votre ordinateur allumé.",
    "Cyro funciona en nuestro alojamiento. No necesitas mantener el ordenador encendido.",
    "Cyro läuft auf unserem Hosting. Dein Computer muss nicht eingeschaltet bleiben.",
    "Cyro roda na nossa hospedagem. Você não precisa manter o computador ligado."
  ],
  [
    "Add Cyro",
    "Ajouter Cyro",
    "Añadir Cyro",
    "Cyro hinzufügen",
    "Adicionar Cyro"
  ],
  [
    "Choose a server you manage and complete Discord’s installation flow.",
    "Choisissez un serveur que vous gérez et suivez l’installation Discord.",
    "Elige un servidor que administres y completa la instalación de Discord.",
    "Wähle einen von dir verwalteten Server und schließe die Discord-Installation ab.",
    "Escolha um servidor que você gerencia e conclua a instalação no Discord."
  ],
  [
    "Use /dashboard in Discord to open your settings, then choose channels, roles and features. Use /help for commands and setup guidance.",
    "Utilisez /dashboard dans Discord pour ouvrir les paramètres, puis choisissez salons, rôles et fonctionnalités. Utilisez /help pour les commandes et l’aide à la configuration.",
    "Usa /dashboard en Discord para abrir la configuración y elegir canales, roles y funciones. Usa /help para comandos e instrucciones.",
    "Öffne mit /dashboard in Discord deine Einstellungen und wähle Kanäle, Rollen und Funktionen. Nutze /help für Befehle und Einrichtungshinweise.",
    "Use /dashboard no Discord para abrir as configurações e escolher canais, cargos e recursos. Use /help para comandos e orientações."
  ],
  [
    "Open the dashboard",
    "Ouvrir le tableau de bord",
    "Abrir el panel",
    "Dashboard öffnen",
    "Abrir o painel"
  ],
  [
    "Bring your creators",
    "Ajoutez vos créateurs",
    "Trae a tus creadores",
    "Hole deine Creator dazu",
    "Traga seus criadores"
  ],
  [
    "Link creator profiles and share the separate connections page. Creators can connect their own TikTok account without staff access.",
    "Liez les profils de créateurs et partagez la page de connexions séparée. Les créateurs peuvent connecter leur compte TikTok sans accès d’équipe.",
    "Vincula perfiles de creador y comparte la página separada de conexiones. Los creadores pueden conectar su TikTok sin acceso de equipo.",
    "Verknüpfe Creator-Profile und teile die separate Verbindungsseite. Creator können ihr TikTok-Konto ohne Teamzugriff verbinden.",
    "Vincule perfis de criador e compartilhe a página separada de conexões. Criadores podem conectar o próprio TikTok sem acesso da equipe."
  ],
  [
    "Creator connections",
    "Connexions des créateurs",
    "Conexiones de creadores",
    "Creator-Verbindungen",
    "Conexões de criadores"
  ],
  [
    "A few useful details",
    "Quelques détails utiles",
    "Algunos detalles útiles",
    "Ein paar nützliche Details",
    "Alguns detalhes úteis"
  ],
  [
    "Good to know.",
    "Bon à savoir.",
    "Conviene saberlo.",
    "Gut zu wissen.",
    "Bom saber."
  ],
  [
    "Need help setting something up? Come say hello.",
    "Besoin d’aide pour configurer quelque chose ? Venez nous voir.",
    "¿Necesitas ayuda para configurar algo? Ven a saludarnos.",
    "Brauchst du Hilfe bei der Einrichtung? Sag uns Hallo.",
    "Precisa de ajuda para configurar algo? Venha falar com a gente."
  ],
  [
    "Who can open my server’s dashboard?",
    "Qui peut ouvrir le tableau de bord de mon serveur ?",
    "¿Quién puede abrir el panel de mi servidor?",
    "Wer kann das Dashboard meines Servers öffnen?",
    "Quem pode abrir o painel do meu servidor?"
  ],
  [
    "Your server owner controls dashboard access. Owners can grant it to selected roles and set command restrictions separately. Dashboard access gives staff management tools; it should go to people you trust. Each server has its own settings and access rules.",
    "Le propriétaire contrôle l’accès au tableau de bord. Il peut l’accorder à certains rôles et définir séparément les restrictions de commandes. Cet accès donne des outils de gestion : réservez-le aux personnes de confiance. Chaque serveur a ses propres paramètres et règles d’accès.",
    "El propietario controla el acceso al panel. Puede concederlo a roles elegidos y restringir comandos por separado. El panel ofrece herramientas de gestión; dalo a personas de confianza. Cada servidor tiene sus ajustes y reglas de acceso.",
    "Der Serverinhaber regelt den Dashboard-Zugriff. Er kann ausgewählten Rollen Zugriff geben und Befehle separat einschränken. Dashboard-Zugriff bietet Verwaltungswerkzeuge und gehört in vertrauenswürdige Hände. Jeder Server hat eigene Einstellungen und Zugriffsregeln.",
    "O dono controla o acesso ao painel. Pode concedê-lo a cargos escolhidos e restringir comandos separadamente. O painel oferece ferramentas de gerenciamento; dê acesso a pessoas de confiança. Cada servidor tem suas configurações e regras de acesso."
  ],
  [
    "Can creators connect without seeing server settings?",
    "Les créateurs peuvent-ils se connecter sans voir les paramètres du serveur ?",
    "¿Pueden los creadores conectarse sin ver la configuración del servidor?",
    "Können Creator sich verbinden, ohne Servereinstellungen zu sehen?",
    "Criadores podem se conectar sem ver as configurações do servidor?"
  ],
  [
    "Yes. Creator connections is a separate page. For TikTok, creators sign in with Discord, review TikTok’s permissions and connect the account they control. They can see recent public videos and disconnect there. They do not need dashboard access.",
    "Oui. Les connexions des créateurs disposent d’une page séparée. Pour TikTok, ils se connectent via Discord, vérifient les autorisations TikTok et lient leur compte. Ils peuvent y voir leurs vidéos publiques récentes et se déconnecter, sans accès au tableau de bord.",
    "Sí. Conexiones de creadores es una página separada. Para TikTok, inician sesión con Discord, revisan permisos y conectan su cuenta. Allí ven vídeos públicos recientes y pueden desconectarse. No necesitan acceso al panel.",
    "Ja. Creator-Verbindungen haben eine eigene Seite. Für TikTok melden sich Creator mit Discord an, prüfen TikTok-Berechtigungen und verbinden ihr Konto. Dort sehen sie aktuelle öffentliche Videos und können die Verbindung trennen. Dashboard-Zugriff ist nicht nötig.",
    "Sim. Conexões de criadores é uma página separada. Para TikTok, entram com Discord, revisam permissões e conectam a própria conta. Lá veem vídeos públicos recentes e podem desconectar. Não precisam de acesso ao painel."
  ],
  [
    "How do temporary room controls work?",
    "Comment fonctionnent les commandes des salons temporaires ?",
    "¿Cómo funcionan los controles de salas temporales?",
    "Wie funktionieren die Steuerungen temporärer Räume?",
    "Como funcionam os controles das salas temporárias?"
  ],
  [
    "Join the server’s “Join to create” channel and Cyro moves you into your own room. Open that voice channel’s text chat for the control panel. The owner and authorised staff can use it while connected to the room.",
    "Rejoignez le salon de création et Cyro vous déplace dans votre propre salle. Ouvrez son chat textuel pour le panneau de contrôle. Le propriétaire et l’équipe autorisée peuvent l’utiliser lorsqu’ils y sont connectés.",
    "Entra al canal de creación y Cyro te mueve a tu propia sala. Abre su chat de texto para ver el panel de control. El dueño y el equipo autorizado pueden usarlo mientras estén conectados.",
    "Betritt den Erstellungskanal und Cyro verschiebt dich in deinen eigenen Raum. Öffne dessen Textchat für das Bedienfeld. Inhaber und berechtigtes Team können es nutzen, während sie im Raum sind.",
    "Entre no canal de criação e Cyro move você para sua própria sala. Abra o chat de texto dela para ver o painel de controle. O dono e a equipe autorizada podem usá-lo enquanto estiverem na sala."
  ],
  [
    "Lock stops ordinary members joining; Allow member gives a selected person access while the room stays locked. Remove member only disconnects someone, so they can rejoin if they still have access. Existing permissions and Discord administrators can override a lock. The room is removed once everyone leaves.",
    "Verrouiller empêche les membres ordinaires d’entrer ; Autoriser un membre donne accès à une personne sans déverrouiller la salle. Retirer un membre le déconnecte seulement : il peut revenir s’il conserve l’accès. Les permissions existantes et les administrateurs Discord peuvent contourner le verrouillage. La salle est supprimée quand tout le monde part.",
    "Bloquear impide entrar a miembros normales; Permitir miembro da acceso a alguien sin desbloquear. Retirar miembro solo desconecta, así que puede volver si conserva acceso. Los permisos existentes y administradores de Discord pueden superar el bloqueo. La sala se elimina cuando todos salen.",
    "Sperren verhindert den Beitritt normaler Mitglieder. Mitglied zulassen gibt einer Person Zugang, während der Raum gesperrt bleibt. Entfernen trennt nur die Verbindung; mit Zugriffsrecht kann die Person zurückkehren. Bestehende Berechtigungen und Discord-Admins können eine Sperre umgehen. Der Raum wird entfernt, wenn alle gehen.",
    "Bloquear impede a entrada de membros comuns; Permitir membro dá acesso a alguém sem desbloquear a sala. Remover membro apenas desconecta, então a pessoa pode voltar se ainda tiver acesso. Permissões existentes e administradores do Discord podem superar o bloqueio. A sala é removida quando todos saem."
  ],
  [
    "Which streaming and video platforms work?",
    "Quelles plateformes de direct et de vidéo sont prises en charge ?",
    "¿Qué plataformas de directos y vídeos funcionan?",
    "Welche Streaming- und Videoplattformen funktionieren?",
    "Quais plataformas de transmissão e vídeo funcionam?"
  ],
  [
    "Creator profiles support Twitch, Kick, YouTube and TikTok. Available alerts depend on the platform and its API access. YouTube alerts require an API key configured by the bot operator. TikTok public-video connections require approved access and creator consent; sandbox access is limited to approved test accounts. TikTok LIVE uses an unofficial connection and may be interrupted by platform changes.",
    "Les profils acceptent Twitch, Kick, YouTube et TikTok. Les alertes dépendent de la plateforme et de son accès API. YouTube exige une clé API configurée par l’opérateur. Les vidéos publiques TikTok nécessitent un accès approuvé et le consentement du créateur ; le bac à sable est limité aux comptes de test approuvés. TikTok LIVE utilise une connexion non officielle pouvant être interrompue par des changements de plateforme.",
    "Los perfiles admiten Twitch, Kick, YouTube y TikTok. Las alertas dependen de la plataforma y su API. YouTube requiere una clave API configurada por el operador. Los vídeos públicos de TikTok necesitan acceso aprobado y consentimiento; el entorno de pruebas se limita a cuentas aprobadas. TikTok LIVE usa una conexión no oficial que puede interrumpirse por cambios de la plataforma.",
    "Profile unterstützen Twitch, Kick, YouTube und TikTok. Benachrichtigungen hängen von Plattform und API-Zugriff ab. YouTube benötigt einen vom Betreiber eingerichteten API-Schlüssel. Öffentliche TikTok-Videos erfordern genehmigten Zugriff und Creator-Zustimmung; die Sandbox ist auf freigegebene Testkonten begrenzt. TikTok LIVE nutzt eine inoffizielle Verbindung, die durch Plattformänderungen ausfallen kann.",
    "Os perfis aceitam Twitch, Kick, YouTube e TikTok. Os alertas dependem da plataforma e do acesso à API. YouTube exige uma chave API configurada pelo operador. Vídeos públicos do TikTok exigem acesso aprovado e consentimento; o ambiente de testes é limitado a contas aprovadas. TikTok LIVE usa uma conexão não oficial que pode falhar com mudanças da plataforma."
  ],
  [
    "Streamer leaderboards only cover time tracked while Cyro’s announcement is active. Viewer and follower figures appear where a provider makes them available; they are not full-account lifetime analytics.",
    "Les classements couvrent uniquement la durée suivie pendant que l’annonce de Cyro est active. Les nombres de spectateurs et d’abonnés apparaissent si la plateforme les fournit ; ce ne sont pas les statistiques complètes du compte.",
    "Las clasificaciones solo cubren el tiempo registrado mientras el aviso de Cyro está activo. Los datos de espectadores y seguidores aparecen cuando la plataforma los ofrece; no son estadísticas históricas completas.",
    "Streamerranglisten erfassen nur Zeit mit aktiver Cyro-Ankündigung. Zuschauer- und Followerzahlen erscheinen, soweit die Plattform sie bereitstellt; sie sind keine vollständige Konto-Lebenszeitstatistik.",
    "Os rankings cobrem somente o tempo registrado enquanto o aviso do Cyro está ativo. Números de espectadores e seguidores aparecem quando a plataforma fornece; não são estatísticas completas de toda a conta."
  ],
  [
    "What can music and text to speech play?",
    "Que peuvent lire la musique et la synthèse vocale ?",
    "¿Qué pueden reproducir la música y el texto a voz?",
    "Was können Musik und Sprachausgabe abspielen?",
    "O que a música e o texto em voz podem reproduzir?"
  ],
  [
    "Music supports compatible direct audio files and radio streams, plus public YouTube videos when YouTube permits access from our host. Playlists, restricted videos and Spotify full-track playback are unavailable. Join a regular voice channel, then use /playmusic. YouTube access is best effort and can be interrupted by platform changes.",
    "La musique prend en charge les fichiers audio directs et radios compatibles, ainsi que les vidéos YouTube publiques lorsque l’accès est autorisé depuis notre hébergement. Playlists, vidéos restreintes et morceaux Spotify complets sont indisponibles. Rejoignez un salon vocal standard et utilisez /playmusic. L’accès YouTube n’est pas garanti et peut être interrompu par des changements de plateforme.",
    "La música admite archivos de audio directos y radios compatibles, además de vídeos públicos de YouTube cuando permite acceso desde nuestro servidor. No admite listas, vídeos restringidos ni canciones completas de Spotify. Entra a un canal de voz normal y usa /playmusic. YouTube no está garantizado y puede fallar por cambios de plataforma.",
    "Musik unterstützt kompatible direkte Audiodateien und Radiostreams sowie öffentliche YouTube-Videos, wenn YouTube den Zugriff vom Host erlaubt. Playlists, eingeschränkte Videos und vollständige Spotify-Titel sind nicht verfügbar. Betritt einen normalen Sprachkanal und nutze /playmusic. YouTube-Zugriff ist nicht garantiert und kann durch Plattformänderungen ausfallen.",
    "A música aceita arquivos de áudio diretos e rádios compatíveis, além de vídeos públicos do YouTube quando permite acesso da nossa hospedagem. Playlists, vídeos restritos e músicas completas do Spotify não estão disponíveis. Entre em um canal de voz comum e use /playmusic. O acesso ao YouTube não é garantido e pode falhar com mudanças da plataforma."
  ],
  [
    "For speech, use /addtts and type in that call’s chat. Only new messages from people in the call are spoken. Use /ttsvoice to search available voices by name or language; the original 12 English voices keep their numbered shortcuts. Choose a voice matching your message language: speech does not translate text. Turn speaker names on to hear who wrote each message. Speech runs locally on Cyro’s host. Cyro uses one voice channel and one mode at a time per server; it does not listen to microphones.",
    "Pour la voix, utilisez /addtts puis écrivez dans le chat de l’appel. Seuls les nouveaux messages des participants sont lus. Recherchez les voix par nom ou langue avec /ttsvoice ; les 12 voix anglaises d’origine gardent leurs raccourcis numérotés. Choisissez la langue du message : la synthèse vocale ne traduit pas le texte. Activez les noms pour entendre l’auteur. La synthèse fonctionne sur l’hébergement de Cyro. Un seul salon et mode sont utilisés à la fois par serveur ; Cyro n’écoute pas les micros.",
    "Para voz, usa /addtts y escribe en el chat de la llamada. Solo lee mensajes nuevos de participantes. Busca voces por nombre o idioma con /ttsvoice; las 12 voces inglesas originales conservan sus atajos numerados. Elige el idioma del mensaje: la voz no traduce el texto. Activa los nombres para oír al autor. La voz funciona en el servidor de Cyro. Solo usa un canal y un modo por servidor a la vez; no escucha micrófonos.",
    "Nutze /addtts und schreibe im Anrufchat. Nur neue Nachrichten von Teilnehmern werden vorgelesen. Suche Stimmen mit /ttsvoice nach Namen oder Sprache; die ursprünglichen 12 englischen Stimmen behalten ihre nummerierten Befehle. Wähle eine Stimme passend zur Nachrichtensprache: Sprachausgabe übersetzt nicht. Aktiviere Sprechernamen, um den Verfasser zu hören. Die Sprachausgabe läuft auf Cyros Host. Cyro nutzt pro Server jeweils einen Sprachkanal und Modus und hört keine Mikrofone ab.",
    "Para voz, use /addtts e escreva no chat da chamada. Somente mensagens novas dos participantes são lidas. Busque vozes por nome ou idioma com /ttsvoice; as 12 vozes inglesas originais mantêm os atalhos numerados. Escolha o idioma da mensagem: a voz não traduz o texto. Ative os nomes para ouvir quem escreveu. A voz roda na hospedagem do Cyro. Ele usa um canal e um modo por vez em cada servidor; não escuta microfones."
  ],
  [
    "Are confessions and invite logs private?",
    "Les confessions et journaux d’invitations sont-ils privés ?",
    "¿Son privadas las confesiones y los registros de invitaciones?",
    "Sind Geständnisse und Einladungsprotokolle privat?",
    "Confissões e registros de convites são privados?"
  ],
  [
    "Confessions hide the author from the public post. Discord still receives the original command and its author. Cyro does not keep confession text or author IDs in its saved confession history.",
    "Les confessions masquent l’auteur dans la publication publique. Discord reçoit toujours la commande d’origine et son auteur. Cyro ne conserve ni texte ni identifiant d’auteur dans son historique de confessions.",
    "Las confesiones ocultan al autor en la publicación pública. Discord recibe el comando original y su autor. Cyro no guarda el texto ni IDs de autores en su historial de confesiones.",
    "Geständnisse verbergen den Verfasser im öffentlichen Beitrag. Discord erhält weiterhin den ursprünglichen Befehl und Verfasser. Cyro speichert weder Text noch Autoren-IDs im Geständnisverlauf.",
    "As confissões ocultam o autor na publicação pública. O Discord ainda recebe o comando original e seu autor. Cyro não guarda o texto nem IDs dos autores no histórico de confissões."
  ],
  [
    "Optional invite history is visible to staff with dashboard access, plus any log channel your staff select. Some invite sources will be unknown; Cyro cannot tell which external website someone clicked an invite on.",
    "L’historique facultatif des invitations est visible par l’équipe ayant accès au tableau de bord et dans le salon de journal choisi. Certaines sources restent inconnues ; Cyro ne sait pas sur quel site externe le lien a été cliqué.",
    "El historial opcional de invitaciones es visible para el equipo con acceso al panel y en el canal de registro elegido. Algunas fuentes serán desconocidas; Cyro no sabe en qué web externa se hizo clic.",
    "Der optionale Einladungsverlauf ist für Teammitglieder mit Dashboard-Zugriff und im gewählten Protokollkanal sichtbar. Manche Quellen bleiben unbekannt; Cyro erkennt nicht, auf welcher externen Website eine Einladung angeklickt wurde.",
    "O histórico opcional de convites é visível para a equipe com acesso ao painel e no canal de registro escolhido. Algumas origens serão desconhecidas; Cyro não identifica em qual site externo o convite foi clicado."
  ],
  [
    "Read the privacy policy",
    "Lire la politique de confidentialité",
    "Leer la política de privacidad",
    "Datenschutzerklärung lesen",
    "Ler a política de privacidade"
  ],
  [
    "Community support",
    "Assistance communautaire",
    "Ayuda de la comunidad",
    "Community-Support",
    "Suporte da comunidade"
  ],
  [
    "Built by Headache Development.",
    "Créé par Headache Development.",
    "Creado por Headache Development.",
    "Entwickelt von Headache Development.",
    "Criado pela Headache Development."
  ],
  [
    "Have an idea for Cyro, or need a hand with your server?",
    "Une idée pour Cyro ou besoin d’aide avec votre serveur ?",
    "¿Tienes una idea para Cyro o necesitas ayuda con tu servidor?",
    "Hast du eine Idee für Cyro oder brauchst Hilfe mit deinem Server?",
    "Tem uma ideia para o Cyro ou precisa de ajuda com seu servidor?"
  ],
  [
    "Legal and creator links",
    "Liens juridiques et créateurs",
    "Enlaces legales y de creadores",
    "Rechtliches und Creator-Links",
    "Links legais e de criadores"
  ],
  [
    "Open source on GitHub",
    "Code source ouvert sur GitHub",
    "Código abierto en GitHub",
    "Quelloffen auf GitHub",
    "Código aberto no GitHub"
  ],
  [
    "Privacy Policy",
    "Politique de confidentialité",
    "Política de privacidad",
    "Datenschutzerklärung",
    "Política de privacidade"
  ],
  [
    "Terms of Service",
    "Conditions d’utilisation",
    "Términos de servicio",
    "Nutzungsbedingungen",
    "Termos de serviço"
  ],
  [
    "Live count from Cyro",
    "Total en direct de Cyro",
    "Total en vivo de Cyro",
    "Live-Anzahl von Cyro",
    "Total ao vivo do Cyro"
  ],
  [
    "Live count temporarily unavailable",
    "Total en direct temporairement indisponible",
    "Total en vivo no disponible temporalmente",
    "Live-Anzahl vorübergehend nicht verfügbar",
    "Total ao vivo temporariamente indisponível"
  ]
];
  window.CyroDashboardCatalogs ||= [];
  window.CyroDashboardCatalogs.push(Object.fromEntries(['fr', 'es', 'de', 'pt'].map((locale, i) => [locale, Object.fromEntries(rows.map(row => [row[0], row[i + 1]]))])));
})();
