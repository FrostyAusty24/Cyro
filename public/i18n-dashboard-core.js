'use strict';
// Developer-owned interface copy. Editable server text and external names stay unchanged.
(() => {
  const rows = [
  [
    "User {id}",
    "Utilisateur {id}",
    "Usuario {id}",
    "Mitglied {id}",
    "Usuário {id}"
  ],
  [
    "{name} · Add bot",
    "{name} · Ajouter le bot",
    "{name} · Añadir bot",
    "{name} · Bot hinzufügen",
    "{name} · Adicionar bot"
  ],
  [
    "Headache Development community and support (opens in a new tab)",
    "Communauté et assistance Headache Development (nouvel onglet)",
    "Comunidad y ayuda de Headache Development (nueva pestaña)",
    "Headache Development Community und Support (neuer Tab)",
    "Comunidade e suporte Headache Development (nova aba)"
  ],
  [
    "Make yourself at home.",
    "Bienvenue chez vous.",
    "Ponte cómodo.",
    "Fühl dich wie zu Hause.",
    "Sinta-se em casa."
  ],
  [
    "No servers granting you dashboard access were found. You can still connect your own creator accounts.",
    "Aucun serveur ne vous donne accès au tableau de bord. Vous pouvez toujours connecter vos comptes de créateur.",
    "No se encontraron servidores que te den acceso al panel. Puedes conectar tus propias cuentas de creador.",
    "Keine Server mit Dashboard-Zugriff gefunden. Du kannst weiterhin deine eigenen Creator-Konten verbinden.",
    "Nenhum servidor concede acesso ao painel. Você ainda pode conectar suas próprias contas de criador."
  ],
  [
    "Connect the bot to start setting up your community.",
    "Connectez le bot pour commencer à configurer votre communauté.",
    "Conecta el bot para configurar tu comunidad.",
    "Verbinde den Bot, um deine Community einzurichten.",
    "Conecte o bot para começar a configurar sua comunidade."
  ],
  [
    "One more step",
    "Encore une étape",
    "Un paso más",
    "Noch ein Schritt",
    "Mais uma etapa"
  ],
  [
    "Add Cyro to this server, then refresh to load its settings.",
    "Ajoutez Cyro à ce serveur, puis actualisez pour charger ses paramètres.",
    "Añade Cyro a este servidor y actualiza para cargar su configuración.",
    "Füge Cyro diesem Server hinzu und aktualisiere, um die Einstellungen zu laden.",
    "Adicione Cyro a este servidor e atualize para carregar as configurações."
  ],
  [
    "{p0} interrupted operation(s) need staff review. ",
    "{p0} opération(s) interrompue(s) nécessitent une vérification de l’équipe. ",
    "{p0} operaciones interrumpidas requieren revisión del equipo. ",
    "{p0} unterbrochene Vorgänge müssen vom Team geprüft werden. ",
    "{p0} operações interrompidas precisam de revisão da equipe. "
  ],
  [
    " or ",
    " ou ",
    " o ",
    " oder ",
    " ou "
  ],
  [
    " before repeating an action.",
    " avant de répéter une action.",
    " antes de repetir una acción.",
    ", bevor du eine Aktion wiederholst.",
    " antes de repetir uma ação."
  ],
  [
    "Put your creators in the spotlight.",
    "Mettez vos créateurs à l’honneur.",
    "Dale protagonismo a tus creadores.",
    "Rücke deine Creator ins Rampenlicht.",
    "Dê destaque aos seus criadores."
  ],
  [
    "Connect a streamer and let the community know when they go live.",
    "Connectez un streamer pour prévenir la communauté de ses directs.",
    "Conecta un streamer y avisa a la comunidad cuando esté en directo.",
    "Verbinde einen Streamer und informiere die Community, wenn er live geht.",
    "Conecte um streamer e avise a comunidade quando ele entrar ao vivo."
  ],
  [
    "{action} · {member}",
    "{action} · {member}",
    "{action} · {member}",
    "{action} · {member}",
    "{action} · {member}"
  ],
  [
    "Ticket closed · {member}",
    "Ticket fermé · {member}",
    "Ticket cerrado · {member}",
    "Ticket geschlossen · {member}",
    "Ticket fechado · {member}"
  ],
  [
    "Ticket opened · {member}",
    "Ticket ouvert · {member}",
    "Ticket abierto · {member}",
    "Ticket geöffnet · {member}",
    "Ticket aberto · {member}"
  ],
  [
    "A fresh start.",
    "Un nouveau départ.",
    "Un nuevo comienzo.",
    "Ein neuer Anfang.",
    "Um novo começo."
  ],
  [
    "Moderation actions and ticket activity will appear here as your community gets going.",
    "Les actions de modération et l’activité des tickets apparaîtront ici au fil de la vie du serveur.",
    "Las acciones de moderación y los tickets aparecerán aquí a medida que crezca tu comunidad.",
    "Moderationsaktionen und Ticketaktivitäten erscheinen hier, sobald deine Community loslegt.",
    "As ações de moderação e a atividade dos tickets aparecerão aqui conforme a comunidade participar."
  ],
  [
    "Settings are private to your server admins.",
    "Les paramètres sont réservés aux administrateurs du serveur.",
    "La configuración es privada para los administradores del servidor.",
    "Einstellungen sind nur für deine Serveradmins sichtbar.",
    "As configurações são restritas aos administradores do servidor."
  ],
  [
    "Server data loaded when you opened this page",
    "Données du serveur chargées à l’ouverture de cette page",
    "Datos del servidor cargados al abrir esta página",
    "Serverdaten beim Öffnen dieser Seite geladen",
    "Dados do servidor carregados ao abrir esta página"
  ],
  [
    "Date unavailable",
    "Date indisponible",
    "Fecha no disponible",
    "Datum nicht verfügbar",
    "Data indisponível"
  ],
  [
    "Use at most {count} entries.",
    "Utilisez au maximum {count} entrées.",
    "Usa como máximo {count} entradas.",
    "Verwende höchstens {count} Einträge.",
    "Use no máximo {count} entradas."
  ],
  [
    "Each entry must be {count} characters or fewer.",
    "Chaque entrée doit contenir au maximum {count} caractères.",
    "Cada entrada debe tener como máximo {count} caracteres.",
    "Jeder Eintrag darf höchstens {count} Zeichen enthalten.",
    "Cada entrada deve ter no máximo {count} caracteres."
  ],
  [
    "Unavailable · {p0}",
    "Indisponible · {p0}",
    "No disponible · {p0}",
    "Nicht verfügbar · {p0}",
    "Indisponível · {p0}"
  ],
  [
    "Unavailable role · {p0}",
    "Rôle indisponible · {p0}",
    "Rol no disponible · {p0}",
    "Nicht verfügbare Rolle · {p0}",
    "Cargo indisponível · {p0}"
  ],
  [
    "A simple game that gives the whole server something to build.",
    "Un jeu simple que tout le serveur peut faire progresser ensemble.",
    "Un juego sencillo para que todo el servidor construya algo juntos.",
    "Ein einfaches Spiel, bei dem der ganze Server gemeinsam etwas aufbaut.",
    "Um jogo simples para todo o servidor construir algo junto."
  ],
  [
    "Next up: {p0}",
    "Prochain nombre : {p0}",
    "Siguiente: {p0}",
    "Als Nächstes: {p0}",
    "Próximo: {p0}"
  ],
  [
    "The highest count reached together",
    "Le plus grand nombre atteint ensemble",
    "El número más alto alcanzado juntos",
    "Die höchste gemeinsam erreichte Zahl",
    "A maior contagem alcançada em conjunto"
  ],
  [
    "Turn a text channel into a community counting game.",
    "Transformez un salon textuel en jeu de comptage collectif.",
    "Convierte un canal de texto en un juego de contar para la comunidad.",
    "Verwandle einen Textkanal in ein gemeinsames Zählspiel.",
    "Transforme um canal de texto em um jogo de contagem da comunidade."
  ],
  [
    "The bot needs View Channel, Read Message History, Send Messages, and Add Reactions.",
    "Le bot a besoin des permissions Voir le salon, Voir les anciens messages, Envoyer des messages et Ajouter des réactions.",
    "El bot necesita Ver canal, Leer el historial de mensajes, Enviar mensajes y Añadir reacciones.",
    "Der Bot benötigt Kanal ansehen, Nachrichtenverlauf anzeigen, Nachrichten senden und Reaktionen hinzufügen.",
    "O bot precisa de Ver canal, Ler histórico de mensagens, Enviar mensagens e Adicionar reações."
  ],
  [
    "Members take turns posting the next whole number. The bot reacts with a check when it is correct.",
    "Les membres publient chacun leur tour le nombre entier suivant. Le bot ajoute une coche si le nombre est correct.",
    "Los miembros se turnan para publicar el siguiente número entero. El bot reacciona con una marca si es correcto.",
    "Mitglieder posten abwechselnd die nächste ganze Zahl. Der Bot reagiert mit einem Häkchen, wenn sie stimmt.",
    "Os membros se revezam para enviar o próximo número inteiro. O bot reage com um visto quando está correto."
  ],
  [
    "Make it a team ritual",
    "Faites-en une habitude collective",
    "Hazlo una tradición del equipo",
    "Macht es zu eurem Teamritual",
    "Crie um ritual da comunidade"
  ],
  [
    "Pin the rules in your counting channel. Members can use /counting to see the current count and the server record.",
    "Épinglez les règles dans le salon de comptage. Les membres peuvent utiliser /counting pour voir le compte actuel et le record du serveur.",
    "Fija las reglas en el canal de contar. Los miembros pueden usar /counting para ver la cuenta actual y el récord del servidor.",
    "Pinne die Regeln im Zählkanal an. Mitglieder sehen mit /counting den aktuellen Stand und den Serverrekord.",
    "Fixe as regras no canal de contagem. Os membros podem usar /counting para ver a contagem atual e o recorde do servidor."
  ],
  [
    "Greet arrivals and departures with a message, a personalized image card, or both.",
    "Saluez les arrivées et les départs avec un message, une carte illustrée personnalisée, ou les deux.",
    "Da la bienvenida y despide con un mensaje, una tarjeta de imagen personalizada o ambos.",
    "Begrüße Ankommende und verabschiede Gehende mit einer Nachricht, einer personalisierten Bildkarte oder beidem.",
    "Dê boas-vindas e despedidas com uma mensagem, um cartão de imagem personalizado ou ambos."
  ],
  [
    "Goodbye announcements are turned off.",
    "Les annonces de départ sont désactivées.",
    "Los avisos de despedida están desactivados.",
    "Abschiedsmeldungen sind deaktiviert.",
    "Os avisos de despedida estão desativados."
  ],
  [
    "Your image card is sent on its own.",
    "Votre carte illustrée est envoyée seule.",
    "La tarjeta de imagen se envía sola.",
    "Deine Bildkarte wird allein gesendet.",
    "Seu cartão de imagem é enviado sozinho."
  ],
  [
    "No goodbye message is set, so no announcement is sent.",
    "Aucun message de départ n’est défini : aucune annonce ne sera envoyée.",
    "No hay un mensaje de despedida, así que no se envía ningún aviso.",
    "Es ist keine Abschiedsnachricht festgelegt, daher wird nichts gesendet.",
    "Nenhuma mensagem de despedida foi definida, então nenhum aviso será enviado."
  ],
  [
    "Sample member. The sent image uses their Discord name and avatar. {note}",
    "Membre fictif. L’image envoyée utilise son nom et son avatar Discord. {note}",
    "Miembro de ejemplo. La imagen enviada usa su nombre y avatar de Discord. {note}",
    "Beispielmitglied. Das gesendete Bild verwendet dessen Discord-Namen und Avatar. {note}",
    "Membro de exemplo. A imagem enviada usa o nome e avatar do Discord. {note}"
  ],
  [
    "Image cards are selected for joins.",
    "Les cartes illustrées sont activées pour les arrivées.",
    "Las tarjetas están activadas para las llegadas.",
    "Bildkarten sind für Beitritte ausgewählt.",
    "Os cartões estão ativados para entradas."
  ],
  [
    "Image cards are selected for leaves.",
    "Les cartes illustrées sont activées pour les départs.",
    "Las tarjetas están activadas para las salidas.",
    "Bildkarten sind für Austritte ausgewählt.",
    "Os cartões estão ativados para saídas."
  ],
  [
    "Choose an image format above to send this card on joins.",
    "Choisissez un format d’image ci-dessus pour envoyer cette carte à l’arrivée.",
    "Elige un formato de imagen arriba para enviar esta tarjeta al entrar.",
    "Wähle oben ein Bildformat, um diese Karte bei Beitritten zu senden.",
    "Escolha um formato de imagem acima para enviar este cartão nas entradas."
  ],
  [
    "Choose an image format above to send this card on leaves.",
    "Choisissez un format d’image ci-dessus pour envoyer cette carte au départ.",
    "Elige un formato de imagen arriba para enviar esta tarjeta al salir.",
    "Wähle oben ein Bildformat, um diese Karte bei Austritten zu senden.",
    "Escolha um formato de imagem acima para enviar este cartão nas saídas."
  ],
  [
    "Self role {p0}",
    "Rôle en libre-service {p0}",
    "Rol autoasignable {p0}",
    "Selbst zuweisbare Rolle {p0}",
    "Cargo autoatribuível {p0}"
  ],
  [
    "Remove self role {p0}",
    "Retirer le rôle en libre-service {p0}",
    "Eliminar rol autoasignable {p0}",
    "Selbst zuweisbare Rolle {p0} entfernen",
    "Remover cargo autoatribuível {p0}"
  ],
  [
    "You can add up to 20 self roles.",
    "Vous pouvez ajouter jusqu’à 20 rôles en libre-service.",
    "Puedes añadir hasta 20 roles autoasignables.",
    "Du kannst bis zu 20 selbst zuweisbare Rollen hinzufügen.",
    "Você pode adicionar até 20 cargos autoatribuíveis."
  ],
  [
    "Send your chosen greetings and give new members their automatic roles.",
    "Envoyez les messages choisis et attribuez automatiquement des rôles aux nouveaux membres.",
    "Envía los saludos elegidos y asigna roles automáticos a los nuevos miembros.",
    "Sende deine gewählten Begrüßungen und weise neuen Mitgliedern automatisch Rollen zu.",
    "Envie as saudações escolhidas e atribua cargos automáticos aos novos membros."
  ],
  [
    "Join and leave announcements are sent here.",
    "Les annonces d’arrivée et de départ sont envoyées ici.",
    "Los avisos de llegada y salida se envían aquí.",
    "Beitritts- und Austrittsmeldungen werden hier gesendet.",
    "Os avisos de entrada e saída são enviados aqui."
  ],
  [
    "Use {user}, {server}, and {count}. Also used if an image cannot be created.",
    "Utilisez {user}, {server} et {count}. Également utilisé si l’image ne peut pas être créée.",
    "Usa {user}, {server} y {count}. También se usa si no se puede crear la imagen.",
    "Verwende {user}, {server} und {count}. Wird auch verwendet, wenn kein Bild erstellt werden kann.",
    "Use {user}, {server} e {count}. Também é usado se a imagem não puder ser criada."
  ],
  [
    "Use {user}, {server}, and {count}. A blank message in Message only mode stays silent; other enabled formats use a short default.",
    "Utilisez {user}, {server} et {count}. Un message vide en mode Message seul n’envoie rien ; les autres formats activés utilisent un court texte par défaut.",
    "Usa {user}, {server} y {count}. Un mensaje vacío en modo Solo mensaje no envía nada; los otros formatos activos usan un texto breve predeterminado.",
    "Verwende {user}, {server} und {count}. Ein leeres Feld im Modus Nur Nachricht sendet nichts; andere aktivierte Formate verwenden einen kurzen Standardtext.",
    "Use {user}, {server} e {count}. Uma mensagem vazia no modo Somente mensagem não envia nada; outros formatos ativos usam um texto padrão curto."
  ],
  [
    "Choose up to 10 roles below the bot’s highest role.",
    "Choisissez jusqu’à 10 rôles placés sous le rôle le plus élevé du bot.",
    "Elige hasta 10 roles por debajo del rol más alto del bot.",
    "Wähle bis zu 10 Rollen unterhalb der höchsten Bot-Rolle.",
    "Escolha até 10 cargos abaixo do cargo mais alto do bot."
  ],
  [
    "Up to 120 characters. Leave blank to hide; supports placeholders.",
    "Jusqu’à 120 caractères. Laissez vide pour masquer ; variables acceptées.",
    "Hasta 120 caracteres. Déjalo vacío para ocultarlo; admite variables.",
    "Bis zu 120 Zeichen. Zum Ausblenden leer lassen; Platzhalter werden unterstützt.",
    "Até 120 caracteres. Deixe vazio para ocultar; aceita variáveis."
  ],
  [
    "The member’s name appears below this heading.",
    "Le nom du membre apparaît sous ce titre.",
    "El nombre del miembro aparece debajo del título.",
    "Der Mitgliedsname erscheint unter dieser Überschrift.",
    "O nome do membro aparece abaixo deste título."
  ],
  [
    "The avatar ring and card heading color.",
    "Couleur du contour de l’avatar et du titre de la carte.",
    "Color del borde del avatar y del título de la tarjeta.",
    "Farbe des Avatar-Rings und der Kartenüberschrift.",
    "Cor do contorno do avatar e do título do cartão."
  ],
  [
    "Create role buttons for interests, notifications, and community groups. Up to 20 roles.",
    "Créez des boutons de rôles pour les centres d’intérêt, les notifications et les groupes. Jusqu’à 20 rôles.",
    "Crea botones de roles para intereses, notificaciones y grupos. Hasta 20 roles.",
    "Erstelle Rollenbuttons für Interessen, Benachrichtigungen und Gruppen. Bis zu 20 Rollen.",
    "Crie botões de cargos para interesses, notificações e grupos. Até 20 cargos."
  ],
  [
    "Save your changes, then use ",
    "Enregistrez vos modifications, puis utilisez ",
    "Guarda los cambios y usa ",
    "Speichere deine Änderungen und verwende dann ",
    "Salve as alterações e use "
  ],
  [
    " in the Discord channel where members should choose roles.",
    " dans le salon Discord où les membres choisiront leurs rôles.",
    " en el canal de Discord donde los miembros elegirán sus roles.",
    " im Discord-Kanal, in dem Mitglieder ihre Rollen wählen sollen.",
    " no canal do Discord onde os membros devem escolher cargos."
  ],
  [
    "This follows the event selected in your image preview.",
    "Cela correspond à l’événement sélectionné dans l’aperçu de l’image.",
    "Esto sigue el evento seleccionado en la vista previa de la imagen.",
    "Dies folgt dem in der Bildvorschau ausgewählten Ereignis.",
    "Isso segue o evento selecionado na prévia da imagem."
  ],
  [
    "Cyro needs Attach Files in your welcome channel. If a card cannot be created or that permission is removed, Cyro sends the text greeting. Missing avatars use the member’s initial.",
    "Cyro a besoin de Joindre des fichiers dans le salon d’accueil. Si la carte ne peut pas être créée ou si cette permission est retirée, Cyro envoie le texte. Sans avatar, l’initiale du membre est utilisée.",
    "Cyro necesita Adjuntar archivos en el canal de bienvenida. Si no se puede crear la tarjeta o se retira ese permiso, envía el saludo de texto. Sin avatar se usa la inicial del miembro.",
    "Cyro benötigt Dateien anhängen im Begrüßungskanal. Kann keine Karte erstellt werden oder fehlt die Berechtigung, sendet Cyro den Begrüßungstext. Ohne Avatar wird der Anfangsbuchstabe verwendet.",
    "Cyro precisa de Anexar arquivos no canal de boas-vindas. Se não puder criar o cartão ou perder essa permissão, envia a saudação em texto. Sem avatar, usa a inicial do membro."
  ],
  [
    "A quick permissions check",
    "Vérification rapide des permissions",
    "Una revisión rápida de permisos",
    "Kurzer Berechtigungscheck",
    "Uma verificação rápida de permissões"
  ],
  [
    "The bot needs Manage Roles, and its highest role must be above every role it assigns. Managed integration roles cannot be self-assigned.",
    "Le bot a besoin de Gérer les rôles et son rôle le plus élevé doit être au-dessus de tous ceux qu’il attribue. Les rôles gérés par des intégrations ne peuvent pas être choisis librement.",
    "El bot necesita Gestionar roles y su rol más alto debe estar por encima de los que asigna. Los roles gestionados por integraciones no son autoasignables.",
    "Der Bot benötigt Rollen verwalten. Seine höchste Rolle muss über allen zugewiesenen Rollen stehen. Integrationsrollen können nicht selbst zugewiesen werden.",
    "O bot precisa de Gerenciar cargos, e seu cargo mais alto deve ficar acima de todos os cargos atribuídos. Cargos gerenciados por integrações não podem ser autoatribuídos."
  ],
  [
    "See where members came from, run optional challenges, and recognize their activity.",
    "Découvrez l’origine des membres, organisez des défis facultatifs et récompensez leur activité.",
    "Descubre de dónde vienen los miembros, organiza retos opcionales y reconoce su actividad.",
    "Sieh, woher Mitglieder kommen, veranstalte optionale Herausforderungen und würdige ihre Aktivität.",
    "Veja de onde vieram os membros, crie desafios opcionais e reconheça a participação."
  ],
  [
    "Invite tracking is waiting for a baseline. The bot needs Manage Server to read invite counts.",
    "Le suivi des invitations attend une référence initiale. Le bot a besoin de Gérer le serveur pour lire leur utilisation.",
    "El seguimiento de invitaciones espera una referencia inicial. El bot necesita Gestionar servidor para leer sus usos.",
    "Die Einladungserfassung wartet auf einen Ausgangsstand. Der Bot benötigt Server verwalten, um Nutzungszahlen zu lesen.",
    "O rastreamento de convites aguarda uma referência inicial. O bot precisa de Gerenciar servidor para ler os usos."
  ],
  [
    "Keep a staff history of members and the invite used. Works with challenges switched off.",
    "Conservez pour l’équipe un historique des membres et des invitations utilisées, même sans défi actif.",
    "Guarda un historial para el equipo de los miembros y la invitación usada. Funciona sin retos activos.",
    "Speichere für das Team einen Verlauf der Mitglieder und verwendeten Einladungen. Funktioniert auch ohne aktive Herausforderungen.",
    "Guarde um histórico para a equipe com os membros e os convites usados. Funciona mesmo com desafios desativados."
  ],
  [
    "Optional: copy future entries to a text channel. Discord permissions decide who can read it. Leave empty for dashboard-only logs.",
    "Facultatif : copiez les prochaines entrées dans un salon textuel. Les permissions Discord définissent qui peut les lire. Laissez vide pour les garder uniquement dans le tableau de bord.",
    "Opcional: copia las próximas entradas a un canal de texto. Los permisos de Discord controlan quién las lee. Déjalo vacío para usar solo el panel.",
    "Optional: Kopiere neue Einträge in einen Textkanal. Discord-Berechtigungen bestimmen den Lesezugriff. Leer lassen, um nur das Dashboard zu nutzen.",
    "Opcional: copie as próximas entradas para um canal de texto. As permissões do Discord definem quem pode ler. Deixe vazio para registrar somente no painel."
  ],
  [
    "Logging begins after you save. Existing members and earlier joins are not backfilled. Cyro needs Manage Server to read invite use counts.",
    "L’enregistrement commence après la sauvegarde. Les membres existants et les anciennes arrivées ne sont pas ajoutés. Cyro a besoin de Gérer le serveur pour lire les utilisations.",
    "El registro empieza al guardar. No se añaden miembros existentes ni llegadas anteriores. Cyro necesita Gestionar servidor para leer los usos de invitaciones.",
    "Die Erfassung beginnt nach dem Speichern. Bestehende Mitglieder und frühere Beitritte werden nicht nachgetragen. Cyro benötigt Server verwalten, um Einladungsnutzungen zu lesen.",
    "O registro começa após salvar. Membros existentes e entradas anteriores não são adicionados. Cyro precisa de Gerenciar servidor para ler os usos de convites."
  ],
  [
    "Count attributed joins and show members their progress with /invites. This is separate from the staff log.",
    "Comptez les arrivées attribuées et affichez la progression avec /invites. Cette fonction est indépendante du journal de l’équipe.",
    "Cuenta las llegadas atribuidas y muestra el progreso con /invites. Es independiente del registro del equipo.",
    "Zähle zugeordnete Beitritte und zeige Mitgliedern ihren Fortschritt mit /invites. Dies ist vom Teamprotokoll unabhängig.",
    "Conte entradas atribuídas e mostre o progresso com /invites. Isso é separado do registro da equipe."
  ],
  [
    "Give your members a reason to bring someone along.",
    "Donnez à vos membres une raison d’inviter quelqu’un.",
    "Dales a los miembros un motivo para traer a alguien.",
    "Gib deinen Mitgliedern einen Grund, jemanden mitzubringen.",
    "Dê aos membros um motivo para convidar alguém."
  ],
  [
    "The target shown alongside each member’s invite progress.",
    "L’objectif affiché avec la progression des invitations de chaque membre.",
    "La meta que se muestra con el progreso de invitaciones de cada miembro.",
    "Das Ziel, das neben dem Einladungsfortschritt jedes Mitglieds steht.",
    "A meta exibida junto ao progresso de convites de cada membro."
  ],
  [
    "Members gain XP through server conversation.",
    "Les membres gagnent de l’XP en discutant sur le serveur.",
    "Los miembros ganan XP al conversar en el servidor.",
    "Mitglieder erhalten XP durch Gespräche auf dem Server.",
    "Os membros ganham XP conversando no servidor."
  ],
  [
    "Members can check their level and XP with /rank. Activity rewards use a cooldown to keep regular conversation worthwhile.",
    "Les membres consultent leur niveau et leur XP avec /rank. Un délai entre les récompenses favorise les échanges réguliers.",
    "Los miembros consultan su nivel y XP con /rank. Las recompensas tienen un intervalo para fomentar conversaciones habituales.",
    "Mitglieder prüfen Level und XP mit /rank. Belohnungen haben eine Wartezeit, damit regelmäßige Gespräche zählen.",
    "Os membros consultam nível e XP com /rank. As recompensas têm um intervalo para valorizar conversas regulares."
  ],
  [
    "See who joined or left, the inviter and invite code when identifiable, and the destination channel. An invite code does not reveal the website or app where somebody clicked it.",
    "Consultez les arrivées et les départs, l’auteur et le code de l’invitation lorsqu’ils sont identifiables, ainsi que le salon de destination. Le code ne révèle pas le site ou l’application d’origine du clic.",
    "Consulta quién entró o salió, quién invitó, el código si se identifica y el canal de destino. El código no revela la web o aplicación donde se hizo clic.",
    "Sieh Beitritte und Austritte, Einladende und Einladungscode, soweit ermittelbar, sowie den Zielkanal. Ein Code verrät nicht, auf welcher Website oder App er angeklickt wurde.",
    "Veja quem entrou ou saiu, quem convidou, o código quando identificado e o canal de destino. O código não revela o site ou aplicativo onde foi clicado."
  ],
  [
    "Discord does not attach an invite code to a join. Cyro compares usage counts; simultaneous joins, expired links, vanity links, and missed events can leave the source unknown.",
    "Discord ne joint pas de code d’invitation aux arrivées. Cyro compare les utilisations ; les arrivées simultanées, liens expirés ou personnalisés et événements manqués peuvent laisser la source inconnue.",
    "Discord no adjunta un código de invitación a las llegadas. Cyro compara los usos; las entradas simultáneas, enlaces caducados o personalizados y eventos perdidos pueden impedir identificar la fuente.",
    "Discord liefert bei Beitritten keinen Einladungscode. Cyro vergleicht Nutzungszahlen; gleichzeitige Beitritte, abgelaufene oder personalisierte Links und verpasste Ereignisse können die Quelle unbekannt lassen.",
    "O Discord não inclui um código de convite na entrada. Cyro compara os usos; entradas simultâneas, links expirados ou personalizados e eventos perdidos podem deixar a origem desconhecida."
  ],
  [
    "Set the log channel permissions in Discord for your preferred audience. Dashboard logs remain limited to members granted access by your server owner.",
    "Définissez les permissions du salon de journal dans Discord selon le public souhaité. Les journaux du tableau de bord restent limités aux membres autorisés par le propriétaire.",
    "Configura los permisos del canal de registro en Discord para el público deseado. El registro del panel sigue limitado a miembros autorizados por el propietario.",
    "Lege die Berechtigungen des Protokollkanals in Discord für dein gewünschtes Publikum fest. Dashboard-Protokolle bleiben auf Mitglieder mit Zugriff durch den Serverinhaber beschränkt.",
    "Defina no Discord as permissões do canal de registro para o público desejado. Os registros do painel continuam restritos aos membros autorizados pelo dono do servidor."
  ],
  [
    "Settings saved. Reload the page to refresh invite history.",
    "Paramètres enregistrés. Rechargez la page pour actualiser l’historique des invitations.",
    "Configuración guardada. Recarga la página para actualizar el historial de invitaciones.",
    "Einstellungen gespeichert. Lade die Seite neu, um den Einladungsverlauf zu aktualisieren.",
    "Configurações salvas. Recarregue a página para atualizar o histórico de convites."
  ],
  [
    "{p0} shown · {p1} recent entries loaded. Up to 1,000 retained per server; the newest 250 appear here. Refresh to load new events.",
    "{p0} affichées · {p1} entrées récentes chargées. Jusqu’à 1 000 sont conservées par serveur ; les 250 dernières sont affichées ici. Actualisez pour charger les nouveaux événements.",
    "{p0} mostradas · {p1} entradas recientes cargadas. Se guardan hasta 1000 por servidor; aquí aparecen las 250 más recientes. Actualiza para cargar nuevos eventos.",
    "{p0} angezeigt · {p1} aktuelle Einträge geladen. Bis zu 1.000 werden pro Server gespeichert; die neuesten 250 erscheinen hier. Aktualisiere für neue Ereignisse.",
    "{p0} exibidas · {p1} entradas recentes carregadas. Até 1.000 ficam salvas por servidor; as 250 mais recentes aparecem aqui. Atualize para carregar novos eventos."
  ],
  [
    "Last recorded join source.",
    "Dernière source d’arrivée enregistrée.",
    "Última fuente de entrada registrada.",
    "Zuletzt erfasste Beitrittsquelle.",
    "Última origem de entrada registrada."
  ],
  [
    "Try another member, inviter or invite code.",
    "Essayez un autre membre, auteur d’invitation ou code.",
    "Prueba otro miembro, invitador o código.",
    "Versuche ein anderes Mitglied, einen anderen Einladenden oder Einladungscode.",
    "Tente outro membro, convidador ou código de convite."
  ],
  [
    "Turn on Log joins and departures and save. Future joins and departures will appear here, even without a challenge.",
    "Activez Enregistrer les arrivées et les départs, puis sauvegardez. Les prochains événements apparaîtront ici, même sans défi.",
    "Activa Registrar llegadas y salidas y guarda. Los próximos eventos aparecerán aquí, incluso sin un reto.",
    "Aktiviere Beitritte und Austritte protokollieren und speichere. Neue Ereignisse erscheinen hier, auch ohne Herausforderung.",
    "Ative Registrar entradas e saídas e salve. Os próximos eventos aparecerão aqui, mesmo sem um desafio."
  ],
  [
    "Save your settings before refreshing history.",
    "Enregistrez vos paramètres avant d’actualiser l’historique.",
    "Guarda la configuración antes de actualizar el historial.",
    "Speichere die Einstellungen, bevor du den Verlauf aktualisierst.",
    "Salve as configurações antes de atualizar o histórico."
  ],
  [
    "One invite increased by one use.",
    "Une invitation a gagné une utilisation.",
    "Una invitación aumentó en un uso.",
    "Eine Einladung wurde einmal zusätzlich genutzt.",
    "Um convite aumentou em um uso."
  ],
  [
    "No reliable baseline yet.",
    "Pas encore de référence fiable.",
    "Aún no hay una referencia fiable.",
    "Noch kein verlässlicher Ausgangsstand.",
    "Ainda não há referência confiável."
  ],
  [
    "Multiple changes; source unclear.",
    "Plusieurs changements ; source incertaine.",
    "Varios cambios; fuente incierta.",
    "Mehrere Änderungen; Quelle unklar.",
    "Várias mudanças; origem incerta."
  ],
  [
    "An invite disappeared before attribution.",
    "Une invitation a disparu avant l’attribution.",
    "Una invitación desapareció antes de atribuirla.",
    "Eine Einladung verschwand vor der Zuordnung.",
    "Um convite desapareceu antes da atribuição."
  ],
  [
    "No identifiable invite-use increase.",
    "Aucune hausse identifiable des utilisations.",
    "No se identifica ningún aumento de usos.",
    "Keine erkennbare Zunahme der Einladungsnutzung.",
    "Nenhum aumento identificável nos usos."
  ],
  [
    "Invite counts unavailable.",
    "Utilisations des invitations indisponibles.",
    "Recuentos de invitaciones no disponibles.",
    "Einladungszahlen nicht verfügbar.",
    "Contagens de convites indisponíveis."
  ],
  [
    "No recorded source for this member.",
    "Aucune source enregistrée pour ce membre.",
    "No hay una fuente registrada para este miembro.",
    "Keine Quelle für dieses Mitglied erfasst.",
    "Nenhuma origem registrada para este membro."
  ],
  [
    "No attributed invites yet.",
    "Aucune invitation attribuée pour le moment.",
    "Aún no hay invitaciones atribuidas.",
    "Noch keine zugeordneten Einladungen.",
    "Ainda não há convites atribuídos."
  ],
  [
    "No community XP yet.",
    "Aucune XP communautaire pour le moment.",
    "Aún no hay XP de la comunidad.",
    "Noch keine Community-XP.",
    "Ainda não há XP da comunidade."
  ],
  [
    "Set clear boundaries and keep a useful record of moderation decisions.",
    "Définissez des limites claires et conservez un historique utile des décisions de modération.",
    "Establece límites claros y guarda un registro útil de las decisiones de moderación.",
    "Setze klare Grenzen und dokumentiere Moderationsentscheidungen nachvollziehbar.",
    "Defina limites claros e mantenha um registro útil das decisões de moderação."
  ],
  [
    "Allow moderation tools and configured message filters.",
    "Activez les outils de modération et les filtres de messages configurés.",
    "Permite las herramientas de moderación y los filtros de mensajes configurados.",
    "Aktiviere Moderationswerkzeuge und konfigurierte Nachrichtenfilter.",
    "Ative as ferramentas de moderação e os filtros de mensagens configurados."
  ],
  [
    "Choose a text channel for moderation records. Its Discord permissions decide who can read them.",
    "Choisissez un salon textuel pour les journaux de modération. Ses permissions Discord définissent qui peut les lire.",
    "Elige un canal de texto para los registros de moderación. Sus permisos de Discord determinan quién los lee.",
    "Wähle einen Textkanal für Moderationsprotokolle. Seine Discord-Berechtigungen bestimmen den Lesezugriff.",
    "Escolha um canal de texto para registros de moderação. As permissões do Discord definem quem pode ler."
  ],
  [
    "One entry per line. The filter checks new messages and edits. Keep your list specific. Up to 100 entries, 80 characters each.",
    "Une entrée par ligne. Le filtre vérifie les nouveaux messages et les modifications. Soyez précis. Jusqu’à 100 entrées de 80 caractères chacune.",
    "Una entrada por línea. El filtro revisa mensajes nuevos y editados. Usa una lista específica. Hasta 100 entradas de 80 caracteres.",
    "Ein Eintrag pro Zeile. Der Filter prüft neue und bearbeitete Nachrichten. Halte die Liste gezielt. Bis zu 100 Einträge mit je 80 Zeichen.",
    "Uma entrada por linha. O filtro verifica mensagens novas e editadas. Seja específico. Até 100 entradas de 80 caracteres cada."
  ],
  [
    "Automatically handle message floods",
    "Traiter automatiquement les rafales de messages",
    "Gestionar automáticamente las avalanchas de mensajes",
    "Nachrichtenfluten automatisch behandeln",
    "Tratar automaticamente o excesso de mensagens"
  ],
  [
    "Time out members who exceed your message limit.",
    "Excluez temporairement les membres dépassant votre limite de messages.",
    "Aísla temporalmente a quienes superen el límite de mensajes.",
    "Schicke Mitglieder, die das Nachrichtenlimit überschreiten, in einen Timeout.",
    "Aplique castigo aos membros que excederem o limite de mensagens."
  ],
  [
    "Messages in one time window.",
    "Messages dans une période donnée.",
    "Mensajes en un intervalo.",
    "Nachrichten innerhalb eines Zeitfensters.",
    "Mensagens em um intervalo."
  ],
  [
    "How long to watch for a flood.",
    "Durée de détection d’une rafale.",
    "Duración para detectar una avalancha.",
    "Zeitraum zur Erkennung einer Nachrichtenflut.",
    "Período para detectar excesso de mensagens."
  ],
  [
    "How long a spam timeout lasts.",
    "Durée d’exclusion temporaire pour spam.",
    "Duración del aislamiento por spam.",
    "Dauer eines Spam-Timeouts.",
    "Duração do castigo por spam."
  ],
  [
    "Use /moderate warn, /moderate timeout, /moderate kick, /moderate ban, and /moderate purge in Discord. Actions require the corresponding Discord permission and respect role hierarchy.",
    "Utilisez /moderate warn, /moderate timeout, /moderate kick, /moderate ban et /moderate purge dans Discord. Les actions exigent les permissions correspondantes et respectent la hiérarchie des rôles.",
    "Usa /moderate warn, /moderate timeout, /moderate kick, /moderate ban y /moderate purge en Discord. Las acciones requieren el permiso correspondiente y respetan la jerarquía de roles.",
    "Verwende /moderate warn, /moderate timeout, /moderate kick, /moderate ban und /moderate purge in Discord. Aktionen erfordern die passende Berechtigung und beachten die Rollenhierarchie.",
    "Use /moderate warn, /moderate timeout, /moderate kick, /moderate ban e /moderate purge no Discord. As ações exigem a permissão correspondente e respeitam a hierarquia de cargos."
  ],
  [
    "Give the bot the right access",
    "Donnez les bons accès au bot",
    "Dale al bot el acceso correcto",
    "Gib dem Bot die richtigen Zugriffsrechte",
    "Dê ao bot o acesso necessário"
  ],
  [
    "Filters need Message Content intent. Timeouts need Moderate Members. Logging needs access to the selected channel.",
    "Les filtres nécessitent l’intent Message Content. Les exclusions temporaires nécessitent Exclure temporairement des membres. Le journal nécessite l’accès au salon sélectionné.",
    "Los filtros necesitan el intent Message Content. Los aislamientos necesitan Moderar miembros. El registro necesita acceso al canal elegido.",
    "Filter benötigen den Message-Content-Intent. Timeouts benötigen Mitglieder moderieren. Protokolle benötigen Zugriff auf den gewählten Kanal.",
    "Os filtros precisam do intent Message Content. Castigos precisam de Moderar membros. O registro precisa de acesso ao canal escolhido."
  ],
  [
    "No reason recorded",
    "Aucun motif enregistré",
    "No se registró ningún motivo",
    "Kein Grund erfasst",
    "Nenhum motivo registrado"
  ],
  [
    "Actions handled by the bot will appear here.",
    "Les actions traitées par le bot apparaîtront ici.",
    "Las acciones del bot aparecerán aquí.",
    "Vom Bot ausgeführte Aktionen erscheinen hier.",
    "As ações realizadas pelo bot aparecerão aqui."
  ],
  [
    "An operation was interrupted. Check the Discord channel or review message and the bot log before repeating it; a step may already have completed.",
    "Une opération a été interrompue. Vérifiez le salon ou le message de validation et le journal du bot avant de la répéter ; une étape peut déjà être terminée.",
    "Se interrumpió una operación. Revisa el canal o mensaje de revisión y el registro del bot antes de repetirla; un paso podría haberse completado.",
    "Ein Vorgang wurde unterbrochen. Prüfe den Discord-Kanal oder die Prüfnachricht und das Botprotokoll, bevor du ihn wiederholst; ein Schritt könnte bereits abgeschlossen sein.",
    "Uma operação foi interrompida. Verifique o canal ou a mensagem de revisão e o registro do bot antes de repetir; uma etapa pode já ter sido concluída."
  ],
  [
    "{kind} · {id}",
    "{kind} · {id}",
    "{kind} · {id}",
    "{kind} · {id}",
    "{kind} · {id}"
  ],
  [
    "Stage: {p0}",
    "Étape : {p0}",
    "Etapa: {p0}",
    "Schritt: {p0}",
    "Etapa: {p0}"
  ],
  [
    "Use ",
    "Utilisez ",
    "Usa ",
    "Verwende ",
    "Use "
  ],
  [
    " in Discord to recheck. After inspecting the outcome, an administrator can use ",
    " dans Discord pour vérifier à nouveau. Après examen du résultat, un administrateur peut utiliser ",
    " en Discord para volver a comprobar. Tras revisar el resultado, un administrador puede usar ",
    " in Discord zum erneuten Prüfen. Nach Prüfung des Ergebnisses kann ein Administrator ",
    " no Discord para verificar novamente. Após conferir o resultado, um administrador pode usar "
  ],
  [
    " with the operation ID and a review reason. Releasing clears stalled local state; it does not change or delete anything in Discord.",
    " avec l’identifiant de l’opération et un motif. La libération efface l’état local bloqué, sans modifier ni supprimer quoi que ce soit dans Discord.",
    " con el ID de la operación y un motivo. Liberar elimina el estado local bloqueado; no cambia ni borra nada en Discord.",
    " mit der Vorgangs-ID und einem Prüfgrund verwenden. Das Freigeben entfernt blockierten lokalen Zustand; es ändert oder löscht nichts in Discord.",
    " com o ID da operação e um motivo. Liberar limpa o estado local travado; não altera nem exclui nada no Discord."
  ],
  [
    "{p0} to review",
    "{p0} à vérifier",
    "{p0} por revisar",
    "{p0} zu prüfen",
    "{p0} para revisar"
  ],
  [
    "The leaderboard starts with your members.",
    "Le classement commence avec vos membres.",
    "La clasificación empieza con tus miembros.",
    "Die Rangliste beginnt mit deinen Mitgliedern.",
    "O ranking começa com seus membros."
  ],
  [
    "Tickets, moderation and application reviews handled through Cyro.",
    "Tickets, modération et candidatures traités avec Cyro.",
    "Tickets, moderación y solicitudes gestionados con Cyro.",
    "Tickets, Moderation und Bewerbungsprüfungen durch Cyro.",
    "Tickets, moderação e avaliações de inscrições realizados pelo Cyro."
  ],
  [
    "Open tickets currently claimed by staff",
    "Tickets ouverts actuellement pris en charge par l’équipe",
    "Tickets abiertos asignados al equipo",
    "Offene, aktuell vom Team übernommene Tickets",
    "Tickets abertos atualmente assumidos pela equipe"
  ],
  [
    "{p0} of {p1} staff shown · {p2}.",
    "{p0} sur {p1} membres de l’équipe affichés · {p2}.",
    "{p0} de {p1} miembros del equipo · {p2}.",
    "{p0} von {p1} Teammitgliedern angezeigt · {p2}.",
    "{p0} de {p1} membros da equipe exibidos · {p2}."
  ],
  [
    "Try a different name or choose All staff activity.",
    "Essayez un autre nom ou choisissez Toute l’activité de l’équipe.",
    "Prueba otro nombre o elige Toda la actividad del equipo.",
    "Versuche einen anderen Namen oder wähle Alle Teamaktivitäten.",
    "Tente outro nome ou escolha Toda a atividade da equipe."
  ],
  [
    "Claim or close a ticket, take a moderation action, or review an application through Cyro to start recording activity.",
    "Prenez en charge ou fermez un ticket, effectuez une action de modération ou examinez une candidature via Cyro pour commencer l’enregistrement.",
    "Asume o cierra un ticket, realiza una acción de moderación o revisa una solicitud con Cyro para empezar a registrar actividad.",
    "Übernimm oder schließe ein Ticket, führe eine Moderationsaktion aus oder prüfe eine Bewerbung mit Cyro, um Aktivität zu erfassen.",
    "Assuma ou feche um ticket, faça uma ação de moderação ou avalie uma inscrição pelo Cyro para começar a registrar atividade."
  ],
  [
    "Staff activity in the selected period. Assigned now is the current workload. Missing averages are shown as a dash. Rank uses the selected sort before filtering.",
    "Activité de l’équipe sur la période choisie. Assignés actuellement indique la charge présente. Les moyennes manquantes sont remplacées par un tiret. Le rang suit le tri choisi avant filtrage.",
    "Actividad del equipo en el período elegido. Asignados ahora es la carga actual. Las medias ausentes se muestran con un guion. El rango usa el orden elegido antes de filtrar.",
    "Teamaktivität im gewählten Zeitraum. Aktuell zugewiesen zeigt die derzeitige Auslastung. Fehlende Mittelwerte erscheinen als Strich. Der Rang folgt der Sortierung vor dem Filtern.",
    "Atividade da equipe no período escolhido. Atribuídos agora indica a carga atual. Médias ausentes aparecem como traço. A posição usa a ordenação escolhida antes da filtragem."
  ],
  [
    "Use a period, activity filter or staff name to find the work you want to review.",
    "Utilisez une période, un filtre d’activité ou un nom pour trouver le travail à examiner.",
    "Usa un período, filtro de actividad o nombre para encontrar el trabajo que quieres revisar.",
    "Nutze Zeitraum, Aktivitätsfilter oder Namen, um die gesuchte Arbeit zu finden.",
    "Use um período, filtro de atividade ou nome para encontrar o trabalho que deseja revisar."
  ],
  [
    " counts ticket claims, ticket closes, moderation actions and application reviews equally. It is an activity count, not a rating of staff quality.",
    " compte à égalité les prises en charge, fermetures de tickets, actions de modération et examens de candidatures. C’est un volume d’activité, pas une note de qualité.",
    " cuenta por igual tickets asumidos y cerrados, acciones de moderación y revisiones de solicitudes. Mide actividad, no la calidad del equipo.",
    " zählt Ticketübernahmen, Ticketabschlüsse, Moderationsaktionen und Bewerbungsprüfungen gleich. Es ist eine Aktivitätszahl, keine Qualitätsbewertung.",
    " conta igualmente tickets assumidos e fechados, ações de moderação e avaliações de inscrições. É uma contagem de atividade, não uma nota de qualidade."
  ],
  [
    " measures time from a ticket being created to that staff member claiming or closing it. A dash means no timed action is available.",
    " mesure le temps entre la création du ticket et sa prise en charge ou fermeture par ce membre. Un tiret signifie qu’aucune durée n’est disponible.",
    " mide el tiempo desde la creación del ticket hasta que ese miembro lo asume o cierra. Un guion indica que no hay una duración disponible.",
    " misst die Zeit von der Ticketerstellung bis zur Übernahme oder Schließung durch dieses Teammitglied. Ein Strich bedeutet, dass keine Zeitmessung vorliegt.",
    " mede o tempo entre a criação do ticket e quando esse membro o assume ou fecha. Um traço indica que não há uma duração disponível."
  ],
  [
    " is the current number of open tickets claimed by each staff member, regardless of the selected period.",
    " est le nombre actuel de tickets ouverts pris en charge par chaque membre de l’équipe, quelle que soit la période choisie.",
    " es el número actual de tickets abiertos asumidos por cada miembro del equipo, independientemente del período elegido.",
    " ist die aktuelle Zahl offener Tickets pro Teammitglied, unabhängig vom gewählten Zeitraum.",
    " é a quantidade atual de tickets abertos assumidos por cada membro da equipe, independentemente do período escolhido."
  ],
  [
    " includes records still stored by Cyro. Actions taken outside Cyro and deleted historical records are not included. The summary totals cover the whole selected period, before filtering.",
    " comprend les données encore conservées par Cyro. Les actions externes et les données supprimées ne sont pas incluses. Les totaux couvrent toute la période choisie, avant filtrage.",
    " incluye registros que Cyro aún conserva. No incluye acciones externas ni registros eliminados. Los totales abarcan todo el período elegido, antes de filtrar.",
    " umfasst die noch von Cyro gespeicherten Einträge. Externe Aktionen und gelöschte Verlaufsdaten sind ausgeschlossen. Die Summen gelten für den gesamten gewählten Zeitraum vor dem Filtern.",
    " inclui registros ainda guardados pelo Cyro. Ações externas e registros excluídos não entram. Os totais cobrem todo o período escolhido, antes da filtragem."
  ],
  [
    "{value} sec",
    "{value} s",
    "{value} s",
    "{value} Sek.",
    "{value} s"
  ],
  [
    "{value} min",
    "{value} min",
    "{value} min",
    "{value} Min.",
    "{value} min"
  ],
  [
    "{value} hr",
    "{value} h",
    "{value} h",
    "{value} Std.",
    "{value} h"
  ],
  [
    "<1 min",
    "<1 min",
    "<1 min",
    "<1 Min.",
    "<1 min"
  ],
  [
    "{hours} hr {minutes} min",
    "{hours} h {minutes} min",
    "{hours} h {minutes} min",
    "{hours} Std. {minutes} Min.",
    "{hours} h {minutes} min"
  ],
  [
    "{covered} of {total} confirmed time has this metric.",
    "Cette mesure couvre {covered} sur {total} de temps confirmé.",
    "Esta métrica cubre {covered} de {total} de tiempo confirmado.",
    "Dieser Messwert deckt {covered} von {total} bestätigter Zeit ab.",
    "Esta métrica cobre {covered} de {total} de tempo confirmado."
  ],
  [
    "{p0}% coverage",
    "Couverture de {p0} %",
    "{p0}% de cobertura",
    "{p0} % Abdeckung",
    "{p0}% de cobertura"
  ],
  [
    "Today and the previous 6 calendar days, in UTC.",
    "Aujourd’hui et les 6 jours précédents, en UTC.",
    "Hoy y los 6 días anteriores, en UTC.",
    "Heute und die vorherigen 6 Kalendertage, in UTC.",
    "Hoje e os 6 dias anteriores, em UTC."
  ],
  [
    "Today and the previous 29 calendar days, in UTC.",
    "Aujourd’hui et les 29 jours précédents, en UTC.",
    "Hoy y los 29 días anteriores, en UTC.",
    "Heute und die vorherigen 29 Kalendertage, in UTC.",
    "Hoje e os 29 dias anteriores, em UTC."
  ],
  [
    "Up to {days} days of retained history.",
    "Jusqu’à {days} jours d’historique conservé.",
    "Hasta {days} días de historial guardado.",
    "Bis zu {days} Tage gespeicherter Verlauf.",
    "Até {days} dias de histórico salvo."
  ],
  [
    "One creator, every connected platform. Explore the accounts behind their activity.",
    "Un créateur, toutes ses plateformes. Explorez les comptes derrière son activité.",
    "Un creador, todas sus plataformas. Explora las cuentas detrás de su actividad.",
    "Ein Creator, alle verbundenen Plattformen. Entdecke die Konten hinter der Aktivität.",
    "Um criador, todas as plataformas conectadas. Explore as contas por trás da atividade."
  ],
  [
    "Retained history · {days} days",
    "Historique conservé · {days} jours",
    "Historial guardado · {days} días",
    "Gespeicherter Verlauf · {days} Tage",
    "Histórico salvo · {days} dias"
  ],
  [
    "Creator statistics are not available yet.",
    "Les statistiques des créateurs ne sont pas encore disponibles.",
    "Las estadísticas de creadores aún no están disponibles.",
    "Creator-Statistiken sind noch nicht verfügbar.",
    "As estatísticas dos criadores ainda não estão disponíveis."
  ],
  [
    "Stream stats are not available yet.",
    "Les statistiques de direct ne sont pas encore disponibles.",
    "Las estadísticas de directos aún no están disponibles.",
    "Stream-Statistiken sind noch nicht verfügbar.",
    "As estatísticas de transmissões ainda não estão disponíveis."
  ],
  [
    "This view needs a bot version that supplies these statistics. Your existing stream alerts can continue to run.",
    "Cette vue nécessite une version du bot fournissant ces statistiques. Les alertes de direct existantes peuvent continuer.",
    "Esta vista necesita una versión del bot que proporcione estas estadísticas. Las alertas existentes pueden seguir funcionando.",
    "Diese Ansicht benötigt eine Botversion, die diese Statistiken liefert. Bestehende Streambenachrichtigungen können weiterlaufen.",
    "Esta visualização precisa de uma versão do bot que forneça essas estatísticas. Os alertas existentes podem continuar funcionando."
  ],
  [
    "Creators with an active account sample",
    "Créateurs avec un relevé de compte actif",
    "Creadores con una muestra de cuenta activa",
    "Creator mit einer aktiven Kontostichprobe",
    "Criadores com uma amostra de conta ativa"
  ],
  [
    "At their most recent saved sample",
    "Lors du dernier relevé enregistré",
    "En su última muestra guardada",
    "Bei der zuletzt gespeicherten Stichprobe",
    "Na última amostra salva"
  ],
  [
    "{p0} leaderboard. {p1} Sorted by {p2}. Unavailable metrics appear last.",
    "Classement {p0}. {p1} Trié par {p2}. Les mesures indisponibles apparaissent en dernier.",
    "Clasificación de {p0}. {p1} Ordenada por {p2}. Las métricas no disponibles aparecen al final.",
    "Rangliste {p0}. {p1} Sortiert nach {p2}. Nicht verfügbare Messwerte stehen zuletzt.",
    "Ranking de {p0}. {p1} Ordenado por {p2}. Métricas indisponíveis aparecem por último."
  ],
  [
    "Unknown creator",
    "Créateur inconnu",
    "Creador desconocido",
    "Unbekannter Creator",
    "Criador desconhecido"
  ],
  [
    "{p0} platform account(s)",
    "{p0} compte(s) de plateforme",
    "{p0} cuentas de plataformas",
    "{p0} Plattformkonten",
    "{p0} contas de plataformas"
  ],
  [
    "Last tracked {p0}",
    "Dernier suivi : {p0}",
    "Último seguimiento: {p0}",
    "Zuletzt erfasst: {p0}",
    "Último registro: {p0}"
  ],
  [
    "The next live announcement starts the story.",
    "La prochaine annonce de direct lancera le suivi.",
    "El próximo aviso de directo inicia la historia.",
    "Die nächste Live-Ankündigung ist der Anfang.",
    "O próximo aviso ao vivo inicia a história."
  ],
  [
    "No confirmed stream activity was tracked in this period. Add a creator in Stream alerts; counting begins when the bot posts a live announcement.",
    "Aucune activité de direct confirmée sur cette période. Ajoutez un créateur dans les alertes ; le suivi commence lorsque le bot publie l’annonce.",
    "No se registró actividad confirmada en este período. Añade un creador en Alertas de directos; el recuento empieza cuando el bot publica el aviso.",
    "In diesem Zeitraum wurde keine bestätigte Streamaktivität erfasst. Füge einen Creator unter Streambenachrichtigungen hinzu; die Erfassung beginnt mit der Live-Ankündigung des Bots.",
    "Nenhuma atividade confirmada foi registrada neste período. Adicione um criador em Alertas de transmissão; a contagem começa quando o bot publica o aviso ao vivo."
  ],
  [
    "{p0}-day retention",
    "Conservation de {p0} jours",
    "Retención de {p0} días",
    "{p0} Tage Aufbewahrung",
    "Retenção de {p0} dias"
  ],
  [
    "Platform time is summed. The peak is the highest single-platform sample.",
    "Les durées des plateformes sont additionnées. Le pic est le relevé le plus élevé sur une seule plateforme.",
    "Se suman los tiempos de las plataformas. El pico es la muestra más alta de una sola plataforma.",
    "Plattformzeiten werden addiert. Der Höchstwert ist die höchste Stichprobe einer einzelnen Plattform.",
    "Os tempos das plataformas são somados. O pico é a maior amostra de uma única plataforma."
  ],
  [
    "Unavailable metrics are never treated as zero.",
    "Les mesures indisponibles ne sont jamais comptées comme zéro.",
    "Las métricas no disponibles nunca se consideran cero.",
    "Nicht verfügbare Messwerte werden nie als null behandelt.",
    "Métricas indisponíveis nunca são consideradas zero."
  ],
  [
    "Every platform contributes its own time",
    "Chaque plateforme apporte sa propre durée",
    "Cada plataforma aporta su propio tiempo",
    "Jede Plattform trägt ihre eigene Zeit bei",
    "Cada plataforma contribui com seu próprio tempo"
  ],
  [
    "Time starts at the bot’s live announcement and stops when the stream ends, alerts pause, or the announcement is deleted. Unconfirmed gaps are excluded. Creator totals add account time: one hour on Twitch and YouTube contributes two platform hours, even when broadcast together.",
    "Le temps commence à l’annonce du bot et s’arrête à la fin du direct, à la pause des alertes ou à la suppression de l’annonce. Les périodes non confirmées sont exclues. Les totaux additionnent les comptes : une heure sur Twitch et YouTube vaut deux heures de plateforme, même en simultané.",
    "El tiempo empieza con el aviso del bot y termina al acabar el directo, pausar alertas o borrar el aviso. Se excluyen intervalos sin confirmar. Los totales suman cuentas: una hora en Twitch y YouTube cuenta como dos horas de plataforma, aunque sean simultáneas.",
    "Die Zeit beginnt mit der Live-Ankündigung und endet bei Streamende, pausierten Benachrichtigungen oder gelöschter Ankündigung. Unbestätigte Lücken sind ausgeschlossen. Kontozeiten werden addiert: Eine Stunde auf Twitch und YouTube ergibt zwei Plattformstunden, auch bei gleichzeitiger Übertragung.",
    "O tempo começa no aviso ao vivo do bot e termina quando a transmissão acaba, os alertas pausam ou o aviso é excluído. Intervalos não confirmados são excluídos. Os totais somam contas: uma hora no Twitch e YouTube vale duas horas de plataforma, mesmo simultâneas."
  ],
  [
    "Read the metrics in context",
    "Interprétez les mesures dans leur contexte",
    "Interpreta las métricas en contexto",
    "Betrachte Messwerte im Zusammenhang",
    "Interprete as métricas no contexto"
  ],
  [
    "Viewer averages are weighted by each account’s covered time; peaks show the highest single-platform sample, not a combined audience. These are sampled concurrent viewers, not total views. Net followers sums supported Twitch gains minus losses; Kick, TikTok, and YouTube are unavailable. Its baseline begins at the first confirmed poll after the announcement. Coverage shows the platform time with that metric.",
    "Les moyennes de spectateurs sont pondérées par la durée couverte de chaque compte ; les pics reflètent le maximum d’une seule plateforme, pas l’audience cumulée. Ce sont des spectateurs simultanés échantillonnés, pas des vues totales. Les abonnés nets additionnent les gains Twitch pris en charge moins les pertes ; Kick, TikTok et YouTube sont indisponibles. La référence commence au premier relevé confirmé après l’annonce. La couverture indique la durée disposant de cette mesure.",
    "La media de espectadores se pondera por el tiempo cubierto de cada cuenta; el pico refleja una sola plataforma, no una audiencia combinada. Son espectadores simultáneos muestreados, no vistas totales. Los seguidores netos suman ganancias de Twitch menos pérdidas; Kick, TikTok y YouTube no están disponibles. La referencia empieza en la primera consulta confirmada tras el aviso. La cobertura muestra el tiempo con esa métrica.",
    "Zuschauerdurchschnitte werden nach erfasster Kontozeit gewichtet; Spitzenwerte zeigen die höchste Einzelplattform-Stichprobe, kein Gesamtpublikum. Erfasst werden gleichzeitige Zuschauer, keine Gesamtaufrufe. Netto-Follower summieren unterstützte Twitch-Zugänge abzüglich Abgänge; Kick, TikTok und YouTube sind nicht verfügbar. Der Ausgangswert beginnt bei der ersten bestätigten Abfrage nach der Ankündigung. Die Abdeckung zeigt die Plattformzeit mit diesem Messwert.",
    "As médias de espectadores são ponderadas pelo tempo coberto de cada conta; os picos mostram a maior amostra de uma plataforma, não um público combinado. São espectadores simultâneos amostrados, não visualizações totais. Seguidores líquidos somam ganhos do Twitch menos perdas; Kick, TikTok e YouTube estão indisponíveis. A referência começa na primeira consulta confirmada após o aviso. A cobertura mostra o tempo com essa métrica."
  ],
  [
    "Periods follow UTC calendar days. Refresh to load new samples.",
    "Les périodes suivent les jours du calendrier UTC. Actualisez pour charger les nouveaux relevés.",
    "Los períodos siguen días naturales UTC. Actualiza para cargar nuevas muestras.",
    "Zeiträume folgen UTC-Kalendertagen. Aktualisiere, um neue Stichproben zu laden.",
    "Os períodos seguem dias do calendário UTC. Atualize para carregar novas amostras."
  ],
  [
    "Sample updated {date}",
    "Exemple mis à jour le {date}",
    "Ejemplo actualizado: {date}",
    "Beispiel aktualisiert: {date}",
    "Exemplo atualizado: {date}"
  ],
  [
    "Last updated {date}",
    "Dernière mise à jour : {date}",
    "Última actualización: {date}",
    "Zuletzt aktualisiert: {date}",
    "Última atualização: {date}"
  ],
  [
    "One profile for each creator, with separate live and uploaded-video announcements.",
    "Un profil par créateur, avec des annonces séparées pour les directs et les vidéos publiées.",
    "Un perfil por creador, con avisos separados para directos y vídeos publicados.",
    "Ein Profil pro Creator mit getrennten Ankündigungen für Livestreams und veröffentlichte Videos.",
    "Um perfil por criador, com avisos separados para transmissões e vídeos publicados."
  ],
  [
    "{p0} creator profile(s) · {p1} connected account(s)",
    "{p0} profil(s) de créateur · {p1} compte(s) connecté(s)",
    "{p0} perfiles de creador · {p1} cuentas conectadas",
    "{p0} Creator-Profile · {p1} verbundene Konten",
    "{p0} perfis de criador · {p1} contas conectadas"
  ],
  [
    "Start with the person behind the stream.",
    "Commencez par la personne derrière le direct.",
    "Empieza por la persona detrás del directo.",
    "Beginne mit der Person hinter dem Stream.",
    "Comece pela pessoa por trás da transmissão."
  ],
  [
    "Create a profile, then connect their Twitch, Kick, TikTok, or YouTube accounts. Existing accounts are never merged automatically.",
    "Créez un profil, puis connectez ses comptes Twitch, Kick, TikTok ou YouTube. Les comptes existants ne sont jamais fusionnés automatiquement.",
    "Crea un perfil y conecta sus cuentas de Twitch, Kick, TikTok o YouTube. Las cuentas existentes nunca se fusionan automáticamente.",
    "Erstelle ein Profil und verbinde Twitch-, Kick-, TikTok- oder YouTube-Konten. Bestehende Konten werden nie automatisch zusammengeführt.",
    "Crie um perfil e conecte suas contas do Twitch, Kick, TikTok ou YouTube. Contas existentes nunca são mescladas automaticamente."
  ],
  [
    "Edit profile {p0}",
    "Modifier le profil {p0}",
    "Editar perfil {p0}",
    "Profil {p0} bearbeiten",
    "Editar perfil {p0}"
  ],
  [
    "Delete empty profile {p0}",
    "Supprimer le profil vide {p0}",
    "Eliminar perfil vacío {p0}",
    "Leeres Profil {p0} löschen",
    "Excluir perfil vazio {p0}"
  ],
  [
    "Discord member: {p0}",
    "Membre Discord : {p0}",
    "Miembro de Discord: {p0}",
    "Discord-Mitglied: {p0}",
    "Membro do Discord: {p0}"
  ],
  [
    "{p0} account(s)",
    "{p0} compte(s)",
    "{p0} cuentas",
    "{p0} Konten",
    "{p0} contas"
  ],
  [
    "Live: {p0}",
    "Direct : {p0}",
    "En directo: {p0}",
    "Live: {p0}",
    "Ao vivo: {p0}"
  ],
  [
    "# {channel}",
    "# {channel}",
    "# {channel}",
    "# {channel}",
    "# {channel}"
  ],
  [
    "Off",
    "Désactivé",
    "Desactivado",
    "Aus",
    "Desativado"
  ],
  [
    "Uploads: # {p0}",
    "Vidéos : # {p0}",
    "Vídeos: # {p0}",
    "Videos: # {p0}",
    "Vídeos: # {p0}"
  ],
  [
    "Enable live alerts for {p0}",
    "Activer les alertes de direct pour {p0}",
    "Activar alertas de directo para {p0}",
    "Live-Benachrichtigungen für {p0} aktivieren",
    "Ativar alertas ao vivo para {p0}"
  ],
  [
    "Edit account {p0}",
    "Modifier le compte {p0}",
    "Editar cuenta {p0}",
    "Konto {p0} bearbeiten",
    "Editar conta {p0}"
  ],
  [
    "Remove account {p0}",
    "Retirer le compte {p0}",
    "Eliminar cuenta {p0}",
    "Konto {p0} entfernen",
    "Remover conta {p0}"
  ],
  [
    "{p0} platform accounts",
    "Comptes de plateforme de {p0}",
    "Cuentas de plataformas de {p0}",
    "Plattformkonten von {p0}",
    "Contas de plataformas de {p0}"
  ],
  [
    "No connected accounts. Add a platform to start announcing this creator.",
    "Aucun compte connecté. Ajoutez une plateforme pour commencer les annonces de ce créateur.",
    "No hay cuentas conectadas. Añade una plataforma para anunciar a este creador.",
    "Keine verbundenen Konten. Füge eine Plattform hinzu, um diesen Creator anzukündigen.",
    "Nenhuma conta conectada. Adicione uma plataforma para começar a anunciar este criador."
  ],
  [
    "{p0} removed account(s) remain grouped here to preserve any history. Deleting an empty profile keeps past account statistics available individually.",
    "{p0} compte(s) retiré(s) restent regroupés ici pour préserver l’historique. La suppression d’un profil vide conserve les statistiques passées séparément.",
    "{p0} cuentas eliminadas siguen agrupadas aquí para conservar el historial. Borrar un perfil vacío mantiene sus estadísticas anteriores disponibles individualmente.",
    "{p0} entfernte Konten bleiben hier gruppiert, um den Verlauf zu erhalten. Beim Löschen eines leeren Profils bleiben frühere Kontostatistiken einzeln verfügbar.",
    "{p0} contas removidas continuam agrupadas aqui para preservar o histórico. Excluir um perfil vazio mantém as estatísticas anteriores disponíveis individualmente."
  ],
  [
    "These accounts were not matched to a profile. Choose a profile explicitly to keep them separate until you decide.",
    "Ces comptes n’ont pas été associés à un profil. Choisissez-en un explicitement ; ils restent séparés jusque-là.",
    "Estas cuentas no están asociadas a un perfil. Elige uno explícitamente; seguirán separadas hasta que decidas.",
    "Diese Konten wurden keinem Profil zugeordnet. Wähle ausdrücklich ein Profil; bis dahin bleiben sie getrennt.",
    "Estas contas não foram associadas a um perfil. Escolha um perfil explicitamente; elas continuam separadas até você decidir."
  ],
  [
    "Assign {p0} {p1}",
    "Attribuer {p0} {p1}",
    "Asignar {p0} {p1}",
    "{p0} {p1} zuordnen",
    "Atribuir {p0} {p1}"
  ],
  [
    "Each account has its own alert settings. Multiple accounts on the same platform are supported. YouTube discovery slows as more channels are tracked (about 15 minutes per distinct channel by default). Provider availability depends on your host.",
    "Chaque compte possède ses propres paramètres d’alerte. Plusieurs comptes d’une même plateforme sont possibles. La découverte YouTube ralentit avec le nombre de chaînes suivies (environ 15 minutes par chaîne distincte par défaut). La disponibilité dépend de l’hébergement.",
    "Cada cuenta tiene sus propios ajustes de alertas. Se admiten varias cuentas de una misma plataforma. La detección de YouTube se ralentiza al seguir más canales (unos 15 minutos por canal distinto de forma predeterminada). La disponibilidad depende del alojamiento.",
    "Jedes Konto hat eigene Benachrichtigungseinstellungen. Mehrere Konten derselben Plattform werden unterstützt. Die YouTube-Erkennung wird bei mehr beobachteten Kanälen langsamer (standardmäßig etwa 15 Minuten je Kanal). Die Verfügbarkeit hängt vom Host ab.",
    "Cada conta tem suas próprias configurações de alerta. Várias contas da mesma plataforma são aceitas. A descoberta do YouTube fica mais lenta com mais canais monitorados (cerca de 15 minutos por canal por padrão). A disponibilidade depende da hospedagem."
  ],
  [
    "Save your profile or account settings first, or discard them to continue.",
    "Enregistrez d’abord les paramètres du profil ou du compte, ou abandonnez-les pour continuer.",
    "Guarda primero los ajustes del perfil o la cuenta, o descártalos para continuar.",
    "Speichere zuerst deine Profil- oder Kontoeinstellungen oder verwirf sie, um fortzufahren.",
    "Salve primeiro as configurações do perfil ou da conta, ou descarte para continuar."
  ],
  [
    "A profile groups only the accounts you choose.",
    "Un profil regroupe uniquement les comptes que vous choisissez.",
    "Un perfil agrupa solo las cuentas que elijas.",
    "Ein Profil gruppiert nur die von dir gewählten Konten.",
    "Um perfil agrupa somente as contas que você escolher."
  ],
  [
    "The shared name displayed above this creator’s platform accounts.",
    "Le nom commun affiché au-dessus des comptes de ce créateur.",
    "El nombre común que aparece sobre las cuentas de este creador.",
    "Der gemeinsame Name über den Plattformkonten dieses Creators.",
    "O nome compartilhado exibido acima das contas deste criador."
  ],
  [
    "Optional. All linked accounts use this member when assigning their live roles.",
    "Facultatif. Tous les comptes liés utilisent ce membre pour attribuer les rôles de direct.",
    "Opcional. Todas las cuentas vinculadas usan este miembro para asignar roles de directo.",
    "Optional. Alle verknüpften Konten verwenden dieses Mitglied für Live-Rollen.",
    "Opcional. Todas as contas vinculadas usam este membro ao atribuir cargos ao vivo."
  ],
  [
    "Enter a creator name.",
    "Saisissez un nom de créateur.",
    "Introduce un nombre de creador.",
    "Gib einen Creator-Namen ein.",
    "Digite um nome de criador."
  ],
  [
    "Enter a valid Discord member ID, or leave it blank.",
    "Saisissez un identifiant de membre Discord valide ou laissez vide.",
    "Introduce un ID válido de miembro de Discord o déjalo vacío.",
    "Gib eine gültige Discord-Mitglieds-ID ein oder lasse das Feld leer.",
    "Digite um ID válido de membro do Discord ou deixe vazio."
  ],
  [
    "Profile created. Add a platform account when ready.",
    "Profil créé. Ajoutez un compte de plateforme quand vous le souhaitez.",
    "Perfil creado. Añade una cuenta de plataforma cuando quieras.",
    "Profil erstellt. Füge ein Plattformkonto hinzu, sobald du bereit bist.",
    "Perfil criado. Adicione uma conta de plataforma quando quiser."
  ],
  [
    "Edit profile · {p0}",
    "Modifier le profil · {p0}",
    "Editar perfil · {p0}",
    "Profil bearbeiten · {p0}",
    "Editar perfil · {p0}"
  ],
  [
    "Move or remove the connected accounts before deleting this profile.",
    "Déplacez ou retirez les comptes connectés avant de supprimer ce profil.",
    "Mueve o elimina las cuentas conectadas antes de borrar este perfil.",
    "Verschiebe oder entferne verbundene Konten, bevor du dieses Profil löschst.",
    "Mova ou remova as contas conectadas antes de excluir este perfil."
  ],
  [
    "Remove {p0}? This removes the profile grouping. Past account statistics are retained and remain available individually.",
    "Supprimer {p0} ? Cela retire le regroupement du profil. Les statistiques passées sont conservées et restent disponibles séparément.",
    "¿Eliminar {p0}? Se elimina la agrupación del perfil. Las estadísticas anteriores se conservan y siguen disponibles individualmente.",
    "{p0} entfernen? Dies entfernt die Profilgruppierung. Frühere Kontostatistiken bleiben gespeichert und einzeln verfügbar.",
    "Remover {p0}? Isso desfaz o agrupamento do perfil. As estatísticas anteriores são preservadas e continuam disponíveis individualmente."
  ],
  [
    "Empty profile deleted. Past account statistics are retained.",
    "Profil vide supprimé. Les statistiques passées sont conservées.",
    "Perfil vacío eliminado. Se conservan las estadísticas anteriores.",
    "Leeres Profil gelöscht. Frühere Kontostatistiken bleiben erhalten.",
    "Perfil vazio excluído. As estatísticas anteriores são preservadas."
  ],
  [
    "Settings apply only to this platform account.",
    "Les paramètres concernent uniquement ce compte de plateforme.",
    "Los ajustes solo se aplican a esta cuenta de plataforma.",
    "Einstellungen gelten nur für dieses Plattformkonto.",
    "As configurações se aplicam somente a esta conta de plataforma."
  ],
  [
    "Connect another account to the selected profile.",
    "Connectez un autre compte au profil sélectionné.",
    "Conecta otra cuenta al perfil seleccionado.",
    "Verbinde ein weiteres Konto mit dem gewählten Profil.",
    "Conecte outra conta ao perfil selecionado."
  ],
  [
    "Live roles use {p0} from {p1}’s profile. Edit the profile to change this member.",
    "Les rôles de direct utilisent {p0}, du profil de {p1}. Modifiez le profil pour changer ce membre.",
    "Los roles de directo usan a {p0} del perfil de {p1}. Edita el perfil para cambiar este miembro.",
    "Live-Rollen verwenden {p0} aus dem Profil von {p1}. Bearbeite das Profil, um das Mitglied zu ändern.",
    "Os cargos ao vivo usam {p0} do perfil de {p1}. Edite o perfil para alterar este membro."
  ],
  [
    "The selected profile has no Discord member linked. Add one to the profile before using a role while live.",
    "Le profil sélectionné n’est lié à aucun membre Discord. Ajoutez-en un avant d’utiliser un rôle de direct.",
    "El perfil seleccionado no tiene un miembro de Discord vinculado. Añade uno antes de usar un rol de directo.",
    "Dem gewählten Profil ist kein Discord-Mitglied zugeordnet. Füge eines hinzu, bevor du eine Live-Rolle verwendest.",
    "O perfil selecionado não tem um membro do Discord vinculado. Adicione um antes de usar um cargo ao vivo."
  ],
  [
    "Twitch, Kick, TikTok: account username. YouTube: @handle, channel ID, or a youtube.com/@handle or /channel/ID URL.",
    "Twitch, Kick, TikTok : nom d’utilisateur. YouTube : @identifiant, ID de chaîne ou URL youtube.com/@handle ou /channel/ID.",
    "Twitch, Kick, TikTok: nombre de usuario. YouTube: @identificador, ID del canal o URL youtube.com/@handle o /channel/ID.",
    "Twitch, Kick, TikTok: Benutzername. YouTube: @Handle, Kanal-ID oder URL youtube.com/@handle oder /channel/ID.",
    "Twitch, Kick, TikTok: nome de usuário. YouTube: @identificador, ID do canal ou URL youtube.com/@handle ou /channel/ID."
  ],
  [
    "creatorname or @YouTubeHandle",
    "nomducreateur ou @IdentifiantYouTube",
    "nombrecreador o @UsuarioYouTube",
    "Creatorname oder @YouTubeHandle",
    "nomecriador ou @UsuarioYouTube"
  ],
  [
    "Choose another profile to move this account and its retained history. Accounts are never merged automatically.",
    "Choisissez un autre profil pour déplacer ce compte et son historique. Les comptes ne sont jamais fusionnés automatiquement.",
    "Elige otro perfil para mover esta cuenta y su historial. Las cuentas nunca se fusionan automáticamente.",
    "Wähle ein anderes Profil, um dieses Konto und seinen Verlauf zu verschieben. Konten werden nie automatisch zusammengeführt.",
    "Escolha outro perfil para mover esta conta e seu histórico. Contas nunca são mescladas automaticamente."
  ],
  [
    "You can link multiple different accounts from the same platform.",
    "Vous pouvez lier plusieurs comptes différents d’une même plateforme.",
    "Puedes vincular varias cuentas distintas de la misma plataforma.",
    "Du kannst mehrere unterschiedliche Konten derselben Plattform verknüpfen.",
    "Você pode vincular várias contas diferentes da mesma plataforma."
  ],
  [
    "The bot needs permission to send messages and embed links here.",
    "Le bot doit pouvoir envoyer des messages et intégrer des liens ici.",
    "El bot necesita permiso para enviar mensajes e insertar enlaces aquí.",
    "Der Bot benötigt hier die Berechtigungen zum Senden von Nachrichten und Einbetten von Links.",
    "O bot precisa de permissão para enviar mensagens e inserir links aqui."
  ],
  [
    "Optional role mention in announcements.",
    "Mention de rôle facultative dans les annonces.",
    "Mención de rol opcional en los avisos.",
    "Optionaler Rollenhinweis in Ankündigungen.",
    "Menção opcional de cargo nos avisos."
  ],
  [
    "Optional role given to the member on the creator profile.",
    "Rôle facultatif attribué au membre du profil de créateur.",
    "Rol opcional para el miembro del perfil de creador.",
    "Optionale Rolle für das Mitglied im Creator-Profil.",
    "Cargo opcional atribuído ao membro do perfil de criador."
  ],
  [
    "Optional text the stream title must contain.",
    "Texte facultatif que le titre du direct doit contenir.",
    "Texto opcional que debe incluir el título del directo.",
    "Optionaler Text, den der Streamtitel enthalten muss.",
    "Texto opcional que o título da transmissão deve conter."
  ],
  [
    "Minimum time between announcements.",
    "Durée minimale entre les annonces.",
    "Tiempo mínimo entre avisos.",
    "Mindestzeit zwischen Ankündigungen.",
    "Tempo mínimo entre avisos."
  ],
  [
    "Leave blank for the default. Placeholders: {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}.",
    "Laissez vide pour utiliser le texte par défaut. Variables : {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}.",
    "Déjalo vacío para usar el texto predeterminado. Variables: {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}.",
    "Leer lassen für den Standardtext. Platzhalter: {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}.",
    "Deixe vazio para usar o padrão. Variáveis: {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}."
  ],
  [
    "Watch this account for live streams. Upload alerts can run separately.",
    "Surveillez les directs de ce compte. Les alertes de vidéos peuvent fonctionner séparément.",
    "Sigue los directos de esta cuenta. Las alertas de vídeos pueden funcionar por separado.",
    "Beobachte Livestreams dieses Kontos. Videobenachrichtigungen können unabhängig laufen.",
    "Monitore as transmissões desta conta. Os alertas de vídeos podem funcionar separadamente."
  ],
  [
    "Choose a creator profile and a destination channel for each enabled alert type.",
    "Choisissez un profil de créateur et un salon de destination pour chaque type d’alerte activé.",
    "Elige un perfil de creador y un canal de destino para cada tipo de alerta activo.",
    "Wähle ein Creator-Profil und für jeden aktiven Benachrichtigungstyp einen Zielkanal.",
    "Escolha um perfil de criador e um canal de destino para cada tipo de alerta ativo."
  ],
  [
    "Add a Discord member to this creator profile before assigning a live role.",
    "Ajoutez un membre Discord à ce profil avant d’attribuer un rôle de direct.",
    "Añade un miembro de Discord a este perfil antes de asignar un rol de directo.",
    "Füge diesem Creator-Profil ein Discord-Mitglied hinzu, bevor du eine Live-Rolle zuweist.",
    "Adicione um membro do Discord a este perfil antes de atribuir um cargo ao vivo."
  ],
  [
    "This platform account is already connected. Edit it to move it between profiles.",
    "Ce compte de plateforme est déjà connecté. Modifiez-le pour le déplacer vers un autre profil.",
    "Esta cuenta de plataforma ya está conectada. Edítala para moverla entre perfiles.",
    "Dieses Plattformkonto ist bereits verbunden. Bearbeite es, um es zwischen Profilen zu verschieben.",
    "Esta conta de plataforma já está conectada. Edite para movê-la entre perfis."
  ],
  [
    "Edit account · {p0} {p1}",
    "Modifier le compte · {p0} {p1}",
    "Editar cuenta · {p0} {p1}",
    "Konto bearbeiten · {p0} {p1}",
    "Editar conta · {p0} {p1}"
  ],
  [
    "Stop {p0} alerts for {p1}? The creator profile and other accounts stay connected. Retained statistics remain available.",
    "Arrêter les alertes {p0} pour {p1} ? Le profil et les autres comptes restent connectés. Les statistiques conservées restent disponibles.",
    "¿Detener las alertas de {p0} para {p1}? El perfil y las otras cuentas siguen conectados. Las estadísticas guardadas siguen disponibles.",
    "{p0}-Benachrichtigungen für {p1} beenden? Das Creator-Profil und andere Konten bleiben verbunden. Gespeicherte Statistiken bleiben verfügbar.",
    "Parar alertas de {p0} para {p1}? O perfil e as outras contas continuam conectados. As estatísticas salvas continuam disponíveis."
  ],
  [
    "Warning",
    "Avertissement",
    "Advertencia",
    "Verwarnung",
    "Advertência"
  ],
  [
    "Timeout",
    "Exclusion temporaire",
    "Aislamiento temporal",
    "Timeout",
    "Castigo"
  ],
  [
    "Kick",
    "Expulsion",
    "Expulsión",
    "Ausschluss",
    "Expulsão"
  ],
  [
    "Ban",
    "Bannissement",
    "Bloqueo",
    "Bann",
    "Banimento"
  ],
  [
    "Unban",
    "Débannissement",
    "Desbloqueo",
    "Entbannung",
    "Desbanimento"
  ],
  [
    "Message cleanup",
    "Nettoyage des messages",
    "Limpieza de mensajes",
    "Nachrichtenbereinigung",
    "Limpeza de mensagens"
  ],
  [
    "Automatic moderation",
    "Modération automatique",
    "Moderación automática",
    "Automatische Moderation",
    "Moderação automática"
  ],
  [
    "Moderation action",
    "Action de modération",
    "Acción de moderación",
    "Moderationsaktion",
    "Ação de moderação"
  ],
  [
    "Ticket creation",
    "Création de ticket",
    "Creación de ticket",
    "Ticketerstellung",
    "Criação de ticket"
  ],
  [
    "Ticket closure",
    "Fermeture de ticket",
    "Cierre de ticket",
    "Ticketabschluss",
    "Fechamento de ticket"
  ],
  [
    "Application submission",
    "Envoi de candidature",
    "Envío de solicitud",
    "Bewerbungseinreichung",
    "Envio de inscrição"
  ],
  [
    "Application acceptance",
    "Acceptation de candidature",
    "Aceptación de solicitud",
    "Bewerbungsannahme",
    "Aceitação de inscrição"
  ],
  [
    "Interrupted operation",
    "Opération interrompue",
    "Operación interrumpida",
    "Unterbrochener Vorgang",
    "Operação interrompida"
  ],
  [
    "Prepared",
    "Préparé",
    "Preparado",
    "Vorbereitet",
    "Preparado"
  ],
  [
    "Sending",
    "Envoi en cours",
    "Enviando",
    "Wird gesendet",
    "Enviando"
  ],
  [
    "Transcript saved",
    "Transcription enregistrée",
    "Transcripción guardada",
    "Transkript gespeichert",
    "Transcrição salva"
  ],
  [
    "Archiving",
    "Archivage en cours",
    "Archivando",
    "Wird archiviert",
    "Arquivando"
  ],
  [
    "Deleting",
    "Suppression en cours",
    "Eliminando",
    "Wird gelöscht",
    "Excluindo"
  ],
  [
    "Changing role",
    "Modification du rôle",
    "Cambiando rol",
    "Rolle wird geändert",
    "Alterando cargo"
  ],
  [
    "Needs review",
    "À vérifier",
    "Requiere revisión",
    "Prüfung erforderlich",
    "Precisa de revisão"
  ],
  [
    "Welcome {user} to {server}!",
    "Bienvenue {user} sur {server} !",
    "¡Bienvenido {user} a {server}!",
    "Willkommen {user} auf {server}!",
    "Boas-vindas {user} ao {server}!"
  ],
  [
    "{user} has left {server}.",
    "{user} a quitté {server}.",
    "{user} ha salido de {server}.",
    "{user} hat {server} verlassen.",
    "{user} saiu de {server}."
  ],
  [
    "Message and image card",
    "Message et carte illustrée",
    "Mensaje y tarjeta de imagen",
    "Nachricht und Bildkarte",
    "Mensagem e cartão de imagem"
  ],
  [
    "Image cards use the member’s Discord avatar.",
    "Les cartes utilisent l’avatar Discord du membre.",
    "Las tarjetas usan el avatar de Discord del miembro.",
    "Bildkarten verwenden den Discord-Avatar des Mitglieds.",
    "Os cartões usam o avatar do Discord do membro."
  ],
  [
    "Choose separately from your join format.",
    "Choisissez indépendamment du format d’arrivée.",
    "Elige por separado del formato de llegada.",
    "Wähle unabhängig vom Beitrittsformat.",
    "Escolha separadamente do formato de entrada."
  ],
  [
    "A dark background keeps the member’s name clear.",
    "Un fond sombre rend le nom du membre lisible.",
    "Un fondo oscuro mantiene legible el nombre del miembro.",
    "Ein dunkler Hintergrund hält den Mitgliedsnamen lesbar.",
    "Um fundo escuro mantém o nome do membro legível."
  ],
  [
    "Active invites",
    "Invitations actives",
    "Invitaciones activas",
    "Aktive Einladungen",
    "Convites ativos"
  ],
  [
    "Total joins",
    "Arrivées totales",
    "Entradas totales",
    "Beitritte insgesamt",
    "Total de entradas"
  ],
  [
    "Level",
    "Niveau",
    "Nivel",
    "Level",
    "Nível"
  ],
  [
    "XP",
    "XP",
    "XP",
    "XP",
    "XP"
  ],
  [
    "Account",
    "Compte",
    "Cuenta",
    "Konto",
    "Conta"
  ],
  [
    "{count} account",
    "{count} compte",
    "{count} cuenta",
    "{count} Konto",
    "{count} conta"
  ],
  [
    "{count} accounts",
    "{count} comptes",
    "{count} cuentas",
    "{count} Konten",
    "{count} contas"
  ]
];
  window.CyroDashboardCatalogs ||= [];
  window.CyroDashboardCatalogs.push(Object.fromEntries(['fr', 'es', 'de', 'pt'].map((locale, i) => [locale, Object.fromEntries(rows.map(row => [row[0], row[i + 1]]))])));
})();
