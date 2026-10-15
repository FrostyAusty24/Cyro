'use strict';

// Developer-owned module copy only. Editable server content is never translated.
(() => {
  const rows = [
  [
    "category",
    "catégorie",
    "categoría",
    "Kategorie",
    "categoria"
  ],
  [
    "form",
    "formulaire",
    "formulario",
    "Formular",
    "formulário"
  ],
  [
    "Shown to members when they choose an option.",
    "Affiché aux membres lors du choix d’une option.",
    "Se muestra al elegir una opción.",
    "Wird Mitgliedern bei der Auswahl angezeigt.",
    "Exibido ao escolher uma opção."
  ],
  [
    "Pause this option without removing existing records.",
    "Suspendre cette option sans supprimer les données existantes.",
    "Pausa esta opción sin borrar los registros existentes.",
    "Diese Option pausieren, ohne bestehende Einträge zu löschen.",
    "Pause esta opção sem apagar os registros existentes."
  ],
  [
    "Discord category where new ticket channels are created.",
    "Catégorie Discord où les nouveaux salons de ticket sont créés.",
    "Categoría de Discord donde se crean los nuevos canales de tickets.",
    "Discord-Kategorie für neue Ticketkanäle.",
    "Categoria do Discord onde os canais de tickets são criados."
  ],
  [
    "Used when keeping a read-only channel. Ignored when deleting after export.",
    "Pour conserver un salon en lecture seule. Ignoré si le salon est supprimé après l’export.",
    "Se usa al conservar un canal de solo lectura. Se ignora si se elimina tras exportarlo.",
    "Für schreibgeschützte Kanäle. Bei Löschung nach dem Export ohne Wirkung.",
    "Usado ao manter um canal somente leitura. Ignorado se ele for excluído após exportar."
  ],
  [
    "Who can manage tickets. With category permissions, give these roles channel access in Discord; private tickets grant them access automatically.",
    "Rôles autorisés à gérer les tickets. Avec les permissions de catégorie, accordez-leur l’accès au salon dans Discord ; les tickets privés le font automatiquement.",
    "Roles que gestionan tickets. Con permisos de categoría, dales acceso al canal en Discord; los tickets privados lo conceden automáticamente.",
    "Rollen zur Ticketverwaltung. Bei Kategorie-Berechtigungen musst du ihnen in Discord Kanalzugriff geben; private Tickets tun dies automatisch.",
    "Quem gerencia tickets. Com permissões da categoria, dê acesso ao canal a esses cargos no Discord; tickets privados concedem acesso automaticamente."
  ],
  [
    "Saved HTML transcripts appear here automatically. Anyone who can read this channel can read the transcripts; choose its permissions in Discord. Large exports are compressed, and original attachment links can expire.",
    "Les transcriptions HTML sont enregistrées ici automatiquement. Toute personne ayant accès au salon peut les lire ; réglez ses permissions dans Discord. Les gros exports sont compressés et les liens des pièces jointes peuvent expirer.",
    "Las transcripciones HTML se guardan aquí automáticamente. Quien pueda leer el canal podrá leerlas; configura sus permisos en Discord. Las exportaciones grandes se comprimen y los enlaces de adjuntos pueden caducar.",
    "HTML-Mitschnitte werden hier automatisch gespeichert. Wer den Kanal lesen kann, kann sie lesen; lege die Berechtigungen in Discord fest. Große Exporte werden komprimiert, ursprüngliche Anhangslinks können ablaufen.",
    "As transcrições HTML são salvas aqui automaticamente. Quem pode ler o canal pode lê-las; ajuste as permissões no Discord. Exportações grandes são compactadas e os links dos anexos podem expirar."
  ],
  [
    "Applies to this ticket category.",
    "S’applique à cette catégorie de ticket.",
    "Se aplica a esta categoría de tickets.",
    "Gilt für diese Ticketkategorie.",
    "Aplica-se a esta categoria de tickets."
  ],
  [
    "Application answers and decision buttons appear here. Discord channel permissions decide who can read the answers; reviewer roles decide who can act on them.",
    "Les réponses et les boutons de décision apparaissent ici. Les permissions du salon déterminent qui peut lire les réponses ; les rôles de révision déterminent qui peut agir.",
    "Aquí aparecen las respuestas y los botones de decisión. Los permisos del canal controlan quién puede leerlas; los roles de revisión, quién puede actuar.",
    "Hier erscheinen Antworten und Entscheidungsbuttons. Kanalberechtigungen regeln den Lesezugriff, Prüferrollen die Bearbeitung.",
    "As respostas e os botões de decisão aparecem aqui. As permissões do canal definem quem pode ler; os cargos de análise definem quem pode agir."
  ],
  [
    "Who can accept or deny this application.",
    "Qui peut accepter ou refuser cette candidature.",
    "Quién puede aceptar o rechazar esta solicitud.",
    "Wer diese Bewerbung annehmen oder ablehnen darf.",
    "Quem pode aceitar ou recusar esta candidatura."
  ],
  [
    "Optional. Must be below Cyro and safe to assign.",
    "Facultatif. Doit être sous Cyro et pouvoir être attribué sans privilèges sensibles.",
    "Opcional. Debe estar debajo de Cyro y ser seguro de asignar.",
    "Optional. Muss unter Cyro stehen und sicher zuweisbar sein.",
    "Opcional. Deve ficar abaixo do Cyro e ser seguro para atribuição."
  ],
  [
    "One question per line. Up to five questions, 100 characters each.",
    "Une question par ligne. Cinq questions maximum, 100 caractères chacune.",
    "Una pregunta por línea. Hasta cinco preguntas de 100 caracteres cada una.",
    "Eine Frage pro Zeile. Höchstens fünf Fragen mit je 100 Zeichen.",
    "Uma pergunta por linha. Até cinco perguntas de 100 caracteres cada."
  ],
  [
    "Your existing {p0} is the default option. Add named {p1} to offer more choices.",
    "Votre configuration actuelle ({p0}) reste l’option par défaut. Ajoutez des options nommées ({p1}) pour offrir plus de choix.",
    "La configuración actual ({p0}) es la opción predeterminada. Añade opciones con nombre ({p1}) para ofrecer más alternativas.",
    "Deine bestehende Einrichtung ({p0}) ist die Standardoption. Ergänze benannte Optionen ({p1}) für mehr Auswahl.",
    "A configuração atual ({p0}) é a opção padrão. Adicione opções nomeadas ({p1}) para oferecer mais escolhas."
  ],
  [
    "support setup",
    "assistance",
    "soporte",
    "Support",
    "suporte"
  ],
  [
    "application",
    "candidature",
    "solicitud",
    "Bewerbung",
    "candidatura"
  ],
  [
    "categories",
    "catégories",
    "categorías",
    "Kategorien",
    "categorias"
  ],
  [
    "forms",
    "formulaires",
    "formularios",
    "Formulare",
    "formulários"
  ],
  [
    "New {p0}",
    "Nouvel élément : {p0}",
    "Nuevo elemento: {p0}",
    "Neu: {p0}",
    "Novo item: {p0}"
  ],
  [
    "Remove {p0}",
    "Supprimer : {p0}",
    "Eliminar: {p0}",
    "Entfernen: {p0}",
    "Remover: {p0}"
  ],
  [
    "Remove {p0}?",
    "Supprimer {p0} ?",
    "¿Eliminar {p0}?",
    "{p0} entfernen?",
    "Remover {p0}?"
  ],
  [
    "Existing tickets and applications keep their saved staff access and settings. This also removes the option from saved panels. Panels with no remaining options are removed.",
    "Les tickets et candidatures existants conservent leurs accès et réglages. L’option est aussi retirée des panneaux enregistrés ; les panneaux sans options sont supprimés.",
    "Los tickets y solicitudes existentes conservan sus accesos y ajustes. La opción se quita también de los paneles guardados; se eliminan los paneles sin opciones.",
    "Bestehende Tickets und Bewerbungen behalten ihre Zugriffsrechte und Einstellungen. Die Option wird auch aus gespeicherten Panels entfernt. Panels ohne Optionen werden gelöscht.",
    "Tickets e candidaturas existentes mantêm seus acessos e configurações. A opção também sai dos painéis salvos; painéis sem opções são removidos."
  ],
  [
    "Use up to 25 {p0}.",
    "Maximum : 25 {p0}.",
    "Máximo: 25 {p0}.",
    "Höchstens 25 {p0}.",
    "Use até 25 {p0}."
  ],
  [
    "Create a panel, choose its options, then publish it to a Discord channel. You can make separate panels for different places in your server.",
    "Créez un panneau, choisissez ses options et publiez-le dans un salon Discord. Vous pouvez utiliser différents panneaux selon les espaces du serveur.",
    "Crea un panel, elige sus opciones y publícalo en un canal de Discord. Puedes crear paneles distintos para cada lugar del servidor.",
    "Erstelle ein Panel, wähle Optionen und veröffentliche es in einem Discord-Kanal. Verschiedene Bereiche können eigene Panels erhalten.",
    "Crie um painel, escolha as opções e publique em um canal do Discord. Você pode ter painéis diferentes em cada área do servidor."
  ],
  [
    "Panel label for {p0}",
    "Libellé du panneau pour {p0}",
    "Etiqueta del panel para {p0}",
    "Panel-Beschriftung für {p0}",
    "Texto do painel para {p0}"
  ],
  [
    "Save your changes before publishing this panel.",
    "Enregistrez vos modifications avant de publier ce panneau.",
    "Guarda los cambios antes de publicar este panel.",
    "Speichere deine Änderungen vor der Veröffentlichung.",
    "Salve as alterações antes de publicar este painel."
  ],
  [
    "Choose the Discord channel to publish in.",
    "Choisissez le salon Discord de publication.",
    "Elige el canal de Discord donde publicar.",
    "Wähle den Discord-Kanal für die Veröffentlichung.",
    "Escolha o canal do Discord onde publicar."
  ],
  [
    "Demo preview only. No message was sent to Discord.",
    "Aperçu de démonstration. Aucun message envoyé dans Discord.",
    "Solo vista previa. No se envió ningún mensaje a Discord.",
    "Nur Demo-Vorschau. Keine Nachricht wurde an Discord gesendet.",
    "Apenas prévia de demonstração. Nenhuma mensagem enviada ao Discord."
  ],
  [
    "{p0} Check the channel before retrying if the request timed out.",
    "{p0} En cas de délai dépassé, vérifiez le salon avant de réessayer.",
    "{p0} Si se agotó el tiempo, revisa el canal antes de reintentar.",
    "{p0} Prüfe bei einer Zeitüberschreitung den Kanal, bevor du es erneut versuchst.",
    "{p0} Se o tempo esgotou, confira o canal antes de tentar novamente."
  ],
  [
    "An internal name to find this panel in the dashboard.",
    "Un nom interne pour retrouver ce panneau dans le tableau de bord.",
    "Un nombre interno para encontrar este panel.",
    "Interner Name, um dieses Panel im Dashboard zu finden.",
    "Um nome interno para encontrar este painel."
  ],
  [
    "Explain which option a member should choose.",
    "Expliquez quelle option choisir.",
    "Explica qué opción debe elegir el miembro.",
    "Erkläre, welche Option Mitglieder wählen sollen.",
    "Explique qual opção o membro deve escolher."
  ],
  [
    "Select the {p0} to include. Edit the labels members see.",
    "Sélectionnez les éléments à inclure ({p0}). Modifiez les libellés visibles par les membres.",
    "Elige las opciones que incluir ({p0}). Edita las etiquetas que verán los miembros.",
    "Wähle die einzufügenden Optionen ({p0}). Bearbeite die sichtbaren Beschriftungen.",
    "Selecione as opções a incluir ({p0}). Edite os textos que os membros verão."
  ],
  [
    "Publishes a new message using the saved panel settings.",
    "Publie un nouveau message avec les réglages enregistrés du panneau.",
    "Publica un mensaje nuevo con los ajustes guardados del panel.",
    "Veröffentlicht eine neue Nachricht mit den gespeicherten Panel-Einstellungen.",
    "Publica uma nova mensagem com as configurações salvas do painel."
  ],
  [
    "Previously posted messages remain in Discord. Remove those messages manually if they are no longer needed.",
    "Les messages déjà publiés restent dans Discord. Supprimez-les manuellement s’ils ne sont plus utiles.",
    "Los mensajes publicados permanecen en Discord. Bórralos manualmente si ya no se necesitan.",
    "Bereits veröffentlichte Nachrichten bleiben in Discord. Lösche sie bei Bedarf manuell.",
    "As mensagens publicadas permanecem no Discord. Exclua-as manualmente se não forem mais necessárias."
  ],
  [
    "Use up to 25 saved support and application panels per server.",
    "Jusqu’à 25 panneaux d’assistance et de candidature enregistrés par serveur.",
    "Hasta 25 paneles guardados de soporte y solicitudes por servidor.",
    "Bis zu 25 gespeicherte Support- und Bewerbungspanels pro Server.",
    "Até 25 painéis salvos de suporte e candidaturas por servidor."
  ],
  [
    "Different topics, the right staff, and one clear place to ask for help.",
    "Des sujets distincts, la bonne équipe et un lieu clair pour demander de l’aide.",
    "Distintos temas, el equipo adecuado y un lugar claro para pedir ayuda.",
    "Verschiedene Themen, das passende Team und ein klarer Ort für Hilfe.",
    "Assuntos diferentes, a equipe certa e um lugar claro para pedir ajuda."
  ],
  [
    "Build separate forms for staff, creators, partnerships, and community roles.",
    "Créez des formulaires distincts pour l’équipe, les créateurs, les partenariats et les rôles de la communauté.",
    "Crea formularios distintos para el equipo, creadores, asociaciones y roles de la comunidad.",
    "Erstelle eigene Formulare für Team, Kreative, Partnerschaften und Community-Rollen.",
    "Crie formulários separados para equipe, criadores, parcerias e cargos da comunidade."
  ],
  [
    "Turn off new requests while retaining existing records.",
    "Suspendre les nouvelles demandes en conservant les données existantes.",
    "Desactiva nuevas solicitudes conservando los registros existentes.",
    "Neue Anfragen deaktivieren und bestehende Einträge behalten.",
    "Desative novas solicitações mantendo os registros existentes."
  ],
  [
    "Configure your options and staff access. Save changes, then publish a button or dropdown panel to any suitable Discord channel.",
    "Configurez les options et l’accès de l’équipe. Enregistrez, puis publiez un panneau à boutons ou menu déroulant dans un salon adapté.",
    "Configura las opciones y el acceso del equipo. Guarda y publica un panel con botones o menú desplegable en un canal adecuado.",
    "Konfiguriere Optionen und Teamzugriff. Speichere und veröffentliche ein Button- oder Auswahlpanel in einem geeigneten Kanal.",
    "Configure opções e acesso da equipe. Salve e publique um painel com botões ou menu suspenso em um canal adequado."
  ],
  [
    "Changing these options applies to new requests. Existing ticket channels keep their Discord permissions, and submitted applications keep their saved reviewer roles.",
    "Ces changements concernent les nouvelles demandes. Les tickets existants gardent leurs permissions Discord ; les candidatures envoyées gardent leurs rôles de révision.",
    "Los cambios afectan a nuevas solicitudes. Los tickets existentes conservan sus permisos y las solicitudes enviadas, sus roles de revisión.",
    "Änderungen gelten für neue Anfragen. Bestehende Tickets behalten ihre Discord-Berechtigungen, eingereichte Bewerbungen ihre Prüferrollen.",
    "As mudanças valem para novas solicitações. Tickets existentes mantêm suas permissões; candidaturas enviadas mantêm seus cargos de análise."
  ],
  [
    "Claimed",
    "Pris en charge",
    "Asignado",
    "Übernommen",
    "Assumido"
  ],
  [
    "Denied",
    "Refusé",
    "Rechazado",
    "Abgelehnt",
    "Recusado"
  ],
  [
    "Archived",
    "Archivé",
    "Archivado",
    "Archiviert",
    "Arquivado"
  ],
  [
    "Deleting",
    "Suppression en cours",
    "Eliminando",
    "Wird gelöscht",
    "Excluindo"
  ],
  [
    "Deleted",
    "Supprimé",
    "Eliminado",
    "Gelöscht",
    "Excluído"
  ],
  [
    "Submitted",
    "Envoyé",
    "Enviado",
    "Eingereicht",
    "Enviado"
  ],
  [
    "Published panels give members a place to get started.",
    "Les panneaux publiés donnent aux membres un point de départ.",
    "Los paneles publicados dan a los miembros un punto de partida.",
    "Veröffentlichte Panels bieten Mitgliedern einen Einstieg.",
    "Os painéis publicados dão aos membros um ponto de partida."
  ],
  [
    "Save your verification settings before publishing.",
    "Enregistrez les réglages de vérification avant de publier.",
    "Guarda los ajustes de verificación antes de publicar.",
    "Speichere die Verifizierungseinstellungen vor der Veröffentlichung.",
    "Salve as configurações de verificação antes de publicar."
  ],
  [
    "Enable verification and save your settings first.",
    "Activez la vérification et enregistrez d’abord les réglages.",
    "Activa la verificación y guarda los ajustes primero.",
    "Aktiviere zuerst die Verifizierung und speichere die Einstellungen.",
    "Ative a verificação e salve as configurações primeiro."
  ],
  [
    "Demo preview only. No Discord message was sent.",
    "Aperçu de démonstration. Aucun message Discord envoyé.",
    "Solo vista previa. No se envió ningún mensaje de Discord.",
    "Nur Demo-Vorschau. Keine Discord-Nachricht wurde gesendet.",
    "Apenas prévia. Nenhuma mensagem enviada ao Discord."
  ],
  [
    "Let new members earn an access role with a reaction or a private image challenge.",
    "Donnez un rôle d’accès aux nouveaux membres via une réaction ou un défi d’image privé.",
    "Da un rol de acceso a nuevos miembros mediante una reacción o un reto de imagen privado.",
    "Neue Mitglieder erhalten eine Zugriffsrolle durch eine Reaktion oder private Bildprüfung.",
    "Dê um cargo de acesso a novos membros por reação ou desafio de imagem privado."
  ],
  [
    "Members receive the selected role after completing your verification method.",
    "Les membres reçoivent le rôle choisi après vérification.",
    "Los miembros reciben el rol elegido tras completar la verificación.",
    "Mitglieder erhalten nach der Verifizierung die gewählte Rolle.",
    "Os membros recebem o cargo escolhido após concluir a verificação."
  ],
  [
    "New members must be able to see this channel.",
    "Les nouveaux membres doivent voir ce salon.",
    "Los nuevos miembros deben poder ver este canal.",
    "Neue Mitglieder müssen diesen Kanal sehen können.",
    "Novos membros precisam conseguir ver este canal."
  ],
  [
    "Use a regular access role below Cyro. Do not assign it automatically on join or through self-role buttons.",
    "Utilisez un rôle d’accès normal sous Cyro. Ne l’attribuez pas à l’arrivée ni via les boutons de rôles libres.",
    "Usa un rol de acceso normal debajo de Cyro. No lo asignes al entrar ni mediante botones de autoasignación.",
    "Nutze eine normale Zugriffsrolle unter Cyro. Vergib sie weder beim Beitritt noch per Selbstzuweisung.",
    "Use um cargo de acesso comum abaixo do Cyro. Não o atribua ao entrar nem por botões de autoatribuição."
  ],
  [
    "This is the embed description. Include the reaction or button instructions you want members to see.",
    "Description de l’encart. Incluez les instructions de réaction ou de bouton destinées aux membres.",
    "Descripción del mensaje insertado. Incluye las instrucciones de reacción o botones para los miembros.",
    "Beschreibung der Einbettung. Füge Anweisungen für Reaktion oder Button ein.",
    "Descrição da mensagem incorporada. Inclua instruções sobre a reação ou o botão para os membros."
  ],
  [
    "Your title and message appear together in an embed. Discord renders formatting; the selected reaction or Verify button appears underneath.",
    "Le titre et le message sont réunis dans un encart. Discord affiche la mise en forme et, dessous, la réaction ou le bouton Vérifier.",
    "El título y el mensaje aparecen juntos. Discord aplica el formato y muestra debajo la reacción o el botón Verificar.",
    "Titel und Nachricht erscheinen gemeinsam als Einbettung. Discord formatiert den Text und zeigt darunter die Reaktion oder den Verifizierungsbutton.",
    "Título e mensagem aparecem juntos na incorporação. O Discord aplica a formatação e mostra a reação ou o botão Verificar abaixo."
  ],
  [
    "Connect the role to server access",
    "Lier le rôle à l’accès au serveur",
    "Vincular el rol al acceso al servidor",
    "Rolle mit Serverzugriff verknüpfen",
    "Vincule o cargo ao acesso ao servidor"
  ],
  [
    "In Discord channel permissions, deny View Channel to @everyone on your normal member channels and allow your verified role. Keep the verification channel visible. Cyro does not rewrite existing channel permissions.",
    "Dans Discord, refusez Voir le salon à @everyone dans les salons réservés aux membres et autorisez votre rôle vérifié. Gardez le salon de vérification visible. Cyro ne modifie pas les permissions existantes.",
    "En Discord, deniega Ver canal a @everyone en los canales para miembros y permite el rol verificado. Mantén visible el canal de verificación. Cyro no cambia los permisos existentes.",
    "Verweigere @everyone in Mitgliederkanälen „Kanal ansehen“ und erlaube es der verifizierten Rolle. Der Verifizierungskanal muss sichtbar bleiben. Cyro ändert keine bestehenden Kanalrechte.",
    "No Discord, negue Ver canal a @everyone nos canais de membros e permita ao cargo verificado. Mantenha o canal de verificação visível. O Cyro não altera permissões existentes."
  ],
  [
    "Cyro needs Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History, and Add Reactions. Its role must sit above the verified role.",
    "Cyro a besoin de Gérer les rôles, Envoyer des messages, Intégrer des liens, Joindre des fichiers, Voir les anciens messages et Ajouter des réactions. Son rôle doit être au-dessus du rôle vérifié.",
    "Cyro necesita Gestionar roles, Enviar mensajes, Insertar enlaces, Adjuntar archivos, Leer historial y Añadir reacciones. Su rol debe estar encima del rol verificado.",
    "Cyro benötigt Rollen verwalten, Nachrichten senden, Links einbetten, Dateien anhängen, Nachrichtenverlauf anzeigen und Reaktionen hinzufügen. Seine Rolle muss über der verifizierten Rolle stehen.",
    "O Cyro precisa de Gerenciar cargos, Enviar mensagens, Inserir links, Anexar arquivos, Ver histórico e Adicionar reações. Seu cargo deve estar acima do verificado."
  ],
  [
    "A useful hurdle",
    "Une barrière utile",
    "Una barrera útil",
    "Eine hilfreiche Hürde",
    "Uma barreira útil"
  ],
  [
    "The image challenge adds friction for automated joins. It does not guarantee protection from determined bots or manual abuse.",
    "Le défi d’image freine les arrivées automatisées, sans garantir une protection contre les bots déterminés ou les abus manuels.",
    "El reto de imagen dificulta las entradas automáticas, pero no garantiza protección contra bots persistentes ni abusos manuales.",
    "Die Bildprüfung erschwert automatisierte Beitritte, garantiert aber keinen Schutz vor hartnäckigen Bots oder manuellem Missbrauch.",
    "O desafio de imagem dificulta entradas automáticas, mas não garante proteção contra bots persistentes ou abuso manual."
  ],
  [
    "Independent of live announcements. Uses the Discord member linked to this creator.",
    "Indépendant des annonces de direct. Utilise le membre Discord lié à ce créateur.",
    "Independiente de los avisos de directo. Usa el miembro de Discord vinculado al creador.",
    "Unabhängig von Live-Ankündigungen. Nutzt das mit dem Creator verknüpfte Discord-Mitglied.",
    "Independente dos anúncios ao vivo. Usa o membro do Discord vinculado ao criador."
  ],
  [
    "Can be different from the live announcement channel.",
    "Peut différer du salon des annonces de direct.",
    "Puede ser distinto al canal de avisos de directo.",
    "Kann vom Kanal für Live-Ankündigungen abweichen.",
    "Pode ser diferente do canal de anúncios ao vivo."
  ],
  [
    "Optional. Included with the {role} placeholder.",
    "Facultatif. Inséré avec {role}.",
    "Opcional. Se incluye con {role}.",
    "Optional. Wird mit {role} eingefügt.",
    "Opcional. Incluído com {role}."
  ],
  [
    "Optional text the video title must contain, ignoring case. Separate from the live title filter.",
    "Texte facultatif requis dans le titre, sans distinction de casse. Filtre distinct de celui des directs.",
    "Texto opcional que debe estar en el título, sin distinguir mayúsculas. Independiente del filtro de directos.",
    "Optionaler Text im Videotitel, ohne Beachtung der Großschreibung. Vom Live-Titelfilter unabhängig.",
    "Texto opcional exigido no título, sem diferenciar maiúsculas. Separado do filtro de lives."
  ],
  [
    "Leave blank for the default. Placeholders: {creator}, {member}, {username}, {platform}, {title}, {url}, {publishedAt}, {role}.",
    "Laissez vide pour le texte par défaut. Variables : {creator}, {member}, {username}, {platform}, {title}, {url}, {publishedAt}, {role}.",
    "Déjalo vacío para usar el texto predeterminado. Variables: {creator}, {member}, {username}, {platform}, {title}, {url}, {publishedAt}, {role}.",
    "Leer lassen für den Standardtext. Platzhalter: {creator}, {member}, {username}, {platform}, {title}, {url}, {publishedAt}, {role}.",
    "Deixe vazio para usar o padrão. Variáveis: {creator}, {member}, {username}, {platform}, {title}, {url}, {publishedAt}, {role}."
  ],
  [
    "The first successful check records existing uploads without announcing them. Only newer videos are announced afterward. Changing a title filter does not repost old videos.",
    "La première vérification enregistre les vidéos existantes sans annonce. Seules les suivantes sont annoncées. Modifier le filtre de titre ne republie pas les anciennes vidéos.",
    "La primera consulta registra vídeos existentes sin anunciarlos. Después solo se anuncian los nuevos. Cambiar el filtro no vuelve a publicar vídeos antiguos.",
    "Die erste erfolgreiche Prüfung erfasst bestehende Videos ohne Ankündigung. Nur neuere werden angekündigt. Filteränderungen veröffentlichen alte Videos nicht erneut.",
    "A primeira consulta registra vídeos existentes sem anunciar. Só os novos são anunciados depois. Alterar o filtro não republica vídeos antigos."
  ],
  [
    "Last upload check: {p0}",
    "Dernière vérification des vidéos : {p0}",
    "Última consulta de vídeos: {p0}",
    "Letzte Videoprüfung: {p0}",
    "Última consulta de vídeos: {p0}"
  ],
  [
    "An earlier upload announcement has an unconfirmed result. Check the Discord channel; Cyro will not send it again automatically and risk a duplicate.",
    "Une annonce précédente reste non confirmée. Vérifiez le salon Discord ; Cyro ne la renverra pas automatiquement pour éviter les doublons.",
    "Un aviso anterior no está confirmado. Revisa el canal; Cyro no lo reenviará automáticamente para evitar duplicados.",
    "Eine frühere Videoankündigung ist unbestätigt. Prüfe den Kanal; Cyro sendet sie zur Vermeidung von Duplikaten nicht automatisch erneut.",
    "Um anúncio anterior não foi confirmado. Confira o canal; o Cyro não reenviará automaticamente para evitar duplicatas."
  ],
  [
    "Save this TikTok account first. Then send its creator sign-in link to the Discord member linked to this profile.",
    "Enregistrez d’abord ce compte TikTok, puis envoyez son lien de connexion au membre Discord lié au profil.",
    "Guarda primero esta cuenta de TikTok y envía el enlace de conexión al miembro de Discord vinculado.",
    "Speichere zuerst dieses TikTok-Konto. Sende dann den Anmeldelink an das verknüpfte Discord-Mitglied.",
    "Salve esta conta TikTok primeiro e envie o link de conexão ao membro do Discord vinculado."
  ],
  [
    "Demo workspace: TikTok authorization is available for real creator profiles after Discord sign-in.",
    "Démo : les vrais profils de créateurs peuvent autoriser TikTok après connexion à Discord.",
    "Demo: los perfiles reales pueden autorizar TikTok tras iniciar sesión con Discord.",
    "Demo: Echte Creator-Profile können TikTok nach der Discord-Anmeldung autorisieren.",
    "Demonstração: perfis reais podem autorizar o TikTok após entrar com Discord."
  ],
  [
    "Link a Discord member to this creator profile before connecting TikTok. That member must sign in and authorize their own TikTok account.",
    "Liez un membre Discord au profil avant de connecter TikTok. Ce membre doit se connecter et autoriser son propre compte.",
    "Vincula un miembro de Discord antes de conectar TikTok. Esa persona debe iniciar sesión y autorizar su propia cuenta.",
    "Verknüpfe vor TikTok ein Discord-Mitglied. Dieses muss sich anmelden und sein eigenes TikTok-Konto autorisieren.",
    "Vincule um membro do Discord antes de conectar o TikTok. Ele precisa entrar e autorizar a própria conta."
  ],
  [
    "TikTok connected as {name}.",
    "TikTok connecté avec {name}.",
    "TikTok conectado como {name}.",
    "TikTok als {name} verbunden.",
    "TikTok conectado como {name}."
  ],
  [
    "TikTok connected.",
    "TikTok connecté.",
    "TikTok conectado.",
    "TikTok verbunden.",
    "TikTok conectado."
  ],
  [
    "This creator has not connected TikTok for public video alerts.",
    "Ce créateur n’a pas connecté TikTok pour les alertes de vidéos publiques.",
    "Este creador no ha conectado TikTok para avisos de vídeos públicos.",
    "Dieser Creator hat TikTok nicht für öffentliche Videoankündigungen verbunden.",
    "Este criador não conectou o TikTok para alertas de vídeos públicos."
  ],
  [
    "The linked Discord member opens this link, signs in with Discord, and approves their TikTok account. Server management permission is not required.",
    "Le membre Discord lié ouvre ce lien, se connecte avec Discord et autorise son compte TikTok. Aucune permission de gestion du serveur n’est requise.",
    "El miembro vinculado abre el enlace, inicia sesión con Discord y autoriza su TikTok. No necesita permiso para gestionar el servidor.",
    "Das verknüpfte Mitglied öffnet den Link, meldet sich mit Discord an und autorisiert TikTok. Serververwaltungsrechte sind nicht nötig.",
    "O membro vinculado abre o link, entra com Discord e autoriza sua conta TikTok. Não precisa de permissão para gerenciar o servidor."
  ],
  [
    "New member",
    "Nouveau membre",
    "Nuevo miembro",
    "Neues Mitglied",
    "Novo membro"
  ],
  [
    "Use {user}, {server}, and {count}. Leave blank to hide this text.",
    "Utilisez {user}, {server} et {count}. Laissez vide pour masquer ce texte.",
    "Usa {user}, {server} y {count}. Déjalo vacío para ocultar el texto.",
    "Nutze {user}, {server} und {count}. Leer lassen, um den Text auszublenden.",
    "Use {user}, {server} e {count}. Deixe vazio para ocultar o texto."
  ],
  [
    "Customize every line. Colours, the accent bar, avatar and divider are shared between your join and leave cards.",
    "Personnalisez chaque ligne. Couleurs, barre d’accent, avatar et séparateur sont communs aux cartes d’arrivée et de départ.",
    "Personaliza cada línea. Los colores, la barra, el avatar y el separador se comparten entre las tarjetas de entrada y salida.",
    "Passe jede Zeile an. Farben, Akzentleiste, Avatar und Trennlinie gelten für Beitritts- und Abschiedskarten.",
    "Personalize cada linha. Cores, barra, avatar e divisor são compartilhados entre os cartões de entrada e saída."
  ],
  [
    "Select Custom solid colour in Card background to use your background colour.",
    "Choisissez Couleur unie personnalisée dans Fond de carte pour utiliser votre couleur.",
    "Elige Color sólido personalizado en Fondo de tarjeta para usar tu color.",
    "Wähle beim Kartenhintergrund „Eigene Volltonfarbe“, um deine Farbe zu nutzen.",
    "Escolha Cor sólida personalizada em Fundo do cartão para usar sua cor."
  ],
  [
    "No selection uses the existing command rules. Selecting roles restricts this command to those roles and the server owner.",
    "Sans sélection, les règles actuelles s’appliquent. Choisir des rôles réserve cette commande à ces rôles et au propriétaire.",
    "Sin selección se aplican las reglas actuales. Elegir roles limita la orden a esos roles y al propietario.",
    "Ohne Auswahl gelten die bisherigen Regeln. Gewählte Rollen beschränken den Befehl auf diese Rollen und den Serverinhaber.",
    "Sem seleção, valem as regras atuais. Escolher cargos limita o comando a eles e ao dono."
  ],
  [
    "Members with Manage Server or Administrator can access the dashboard when enabled. The owner always has access.",
    "Si activé, les membres avec Gérer le serveur ou Administrateur accèdent au tableau de bord. Le propriétaire garde toujours l’accès.",
    "Si está activo, los miembros con Gestionar servidor o Administrador acceden al panel. El propietario siempre tiene acceso.",
    "Wenn aktiviert, erhalten Mitglieder mit Server verwalten oder Administrator Dashboard-Zugriff. Der Inhaber hat immer Zugriff.",
    "Quando ativado, membros com Gerenciar servidor ou Administrador acessam o painel. O dono sempre tem acesso."
  ],
  [
    "These roles can view server records, change settings and publish messages or polls. They cannot edit access rules.",
    "Ces rôles peuvent consulter les données, changer les réglages et publier messages ou sondages, mais pas modifier les règles d’accès.",
    "Estos roles pueden ver registros, cambiar ajustes y publicar mensajes o encuestas, pero no editar reglas de acceso.",
    "Diese Rollen können Einträge ansehen, Einstellungen ändern und Nachrichten oder Umfragen veröffentlichen, aber keine Zugriffsregeln ändern.",
    "Esses cargos podem ver registros, alterar configurações e publicar mensagens ou enquetes, mas não editar regras de acesso."
  ],
  [
    "Access roles must be assigned by your staff in Discord. They cannot also be welcome, verification, self-assignable, application reward, or streaming roles.",
    "L’équipe doit attribuer ces rôles dans Discord. Ils ne peuvent pas servir aussi à l’accueil, la vérification, l’auto-attribution, aux candidatures ou aux directs.",
    "El equipo debe asignar estos roles en Discord. No pueden usarse también para bienvenida, verificación, autoasignación, premios de solicitudes o directos.",
    "Diese Rollen muss dein Team in Discord vergeben. Sie dürfen nicht zugleich Begrüßungs-, Verifizierungs-, Selbstzuweisungs-, Bewerbungs- oder Streamingrollen sein.",
    "A equipe deve atribuir esses cargos no Discord. Eles não podem servir também para boas-vindas, verificação, autoatribuição, aprovação de candidaturas ou lives."
  ],
  [
    "Only the server owner can save these settings. Changes apply on the next request; a removed role loses access without signing out.",
    "Seul le propriétaire peut enregistrer ces réglages. Ils s’appliquent à la prochaine requête ; un rôle retiré perd l’accès sans déconnexion.",
    "Solo el propietario puede guardar estos ajustes. Se aplican en la próxima petición; un rol retirado pierde el acceso sin cerrar sesión.",
    "Nur der Serverinhaber kann speichern. Änderungen gelten ab der nächsten Anfrage; eine entfernte Rolle verliert sofort ihren Zugriff, ohne Abmeldung.",
    "Só o dono pode salvar. As mudanças valem na próxima solicitação; um cargo removido perde acesso sem precisar sair da conta."
  ],
  [
    "Moderation needs its normal Discord permissions and role hierarchy. Ticket actions still need support staff access. Discord’s Server Settings → Integrations may also hide commands; allow a role there if needed.",
    "La modération conserve les permissions et la hiérarchie Discord habituelles. Les tickets nécessitent l’accès de l’équipe. Réglages du serveur → Intégrations peut aussi masquer des commandes ; autorisez-y un rôle si besoin.",
    "La moderación conserva los permisos y jerarquía de Discord. Los tickets requieren acceso del equipo. Ajustes del servidor → Integraciones también puede ocultar comandos; permite un rol allí si hace falta.",
    "Moderation benötigt weiterhin Discord-Rechte und Rollenhierarchie, Tickets den Supportzugriff. Servereinstellungen → Integrationen kann Befehle zusätzlich ausblenden; erlaube dort bei Bedarf eine Rolle.",
    "A moderação mantém as permissões e a hierarquia do Discord. Tickets exigem acesso da equipe. Configurações do servidor → Integrações também pode ocultar comandos; permita um cargo ali se necessário."
  ],
  [
    "Publish a question with answer choices. Members vote on the poll in Discord.",
    "Publiez une question avec plusieurs choix. Les membres votent dans Discord.",
    "Publica una pregunta con opciones. Los miembros votan en Discord.",
    "Veröffentliche eine Frage mit Antwortmöglichkeiten. Mitglieder stimmen in Discord ab.",
    "Publique uma pergunta com opções. Os membros votam no Discord."
  ],
  [
    "Write an announcement, rules post or update with a styled embed.",
    "Rédigez une annonce, des règles ou une mise à jour dans un encart.",
    "Escribe un anuncio, reglas o novedades con un mensaje insertado.",
    "Schreibe Ankündigungen, Regeln oder Neuigkeiten als gestaltete Einbettung.",
    "Escreva um anúncio, regras ou novidade com uma mensagem incorporada."
  ],
  [
    "{p0} hours · {p1}",
    "{p0} heures · {p1}",
    "{p0} horas · {p1}",
    "{p0} Stunden · {p1}",
    "{p0} horas · {p1}"
  ],
  [
    "Multiple answers",
    "Réponses multiples",
    "Varias respuestas",
    "Mehrere Antworten",
    "Várias respostas"
  ],
  [
    "One answer per person",
    "Une réponse par personne",
    "Una respuesta por persona",
    "Eine Antwort pro Person",
    "Uma resposta por pessoa"
  ],
  [
    "Thumbnail: {url}",
    "Miniature : {url}",
    "Miniatura: {url}",
    "Vorschaubild: {url}",
    "Miniatura: {url}"
  ],
  [
    "Image: {url}",
    "Image : {url}",
    "Imagen: {url}",
    "Bild: {url}",
    "Imagem: {url}"
  ],
  [
    "Cyro needs Send Polls here. Polls use regular text channels.",
    "Cyro a besoin d’Envoyer des sondages ici. Les sondages utilisent des salons textuels normaux.",
    "Cyro necesita Enviar encuestas aquí. Las encuestas usan canales de texto normales.",
    "Cyro benötigt hier Umfragen senden. Umfragen nutzen normale Textkanäle.",
    "O Cyro precisa de Enviar enquetes aqui. Enquetes usam canais de texto comuns."
  ],
  [
    "You need View Channel and Send Messages here; Cyro also needs Embed Links.",
    "Vous avez besoin de Voir le salon et Envoyer des messages ; Cyro a aussi besoin d’Intégrer des liens.",
    "Necesitas Ver canal y Enviar mensajes; Cyro también necesita Insertar enlaces.",
    "Du benötigst Kanal ansehen und Nachrichten senden; Cyro außerdem Links einbetten.",
    "Você precisa de Ver canal e Enviar mensagens; o Cyro também precisa de Inserir links."
  ],
  [
    "Optional text above the embed. Mentions never notify anyone.",
    "Texte facultatif au-dessus de l’encart. Les mentions n’envoient aucune notification.",
    "Texto opcional sobre el mensaje insertado. Las menciones no notifican.",
    "Optionaler Text über der Einbettung. Erwähnungen lösen keine Benachrichtigung aus.",
    "Texto opcional acima da incorporação. Menções não notificam ninguém."
  ],
  [
    "Discord markdown is supported in the posted message. Preview displays literal text.",
    "Le message publié accepte le Markdown Discord. L’aperçu affiche le texte brut.",
    "El mensaje publicado admite Markdown de Discord. La vista previa muestra el texto literal.",
    "Die Veröffentlichung unterstützt Discord-Markdown. Die Vorschau zeigt unverarbeiteten Text.",
    "A publicação aceita Markdown do Discord. A prévia mostra o texto literal."
  ],
  [
    "Optional HTTPS link.",
    "Lien HTTPS facultatif.",
    "Enlace HTTPS opcional.",
    "Optionaler HTTPS-Link.",
    "Link HTTPS opcional."
  ],
  [
    "Public HTTPS image. Discord loads it when posted.",
    "Image HTTPS publique, chargée par Discord après publication.",
    "Imagen HTTPS pública. Discord la carga al publicar.",
    "Öffentliches HTTPS-Bild. Discord lädt es bei Veröffentlichung.",
    "Imagem HTTPS pública. O Discord carrega ao publicar."
  ],
  [
    "Field {p0} name",
    "Nom du champ {p0}",
    "Nombre del campo {p0}",
    "Name für Feld {p0}",
    "Nome do campo {p0}"
  ],
  [
    "Field {p0} value",
    "Valeur du champ {p0}",
    "Valor del campo {p0}",
    "Wert für Feld {p0}",
    "Valor do campo {p0}"
  ],
  [
    "Field {p0} inline",
    "Champ {p0} en ligne",
    "Campo {p0} en línea",
    "Feld {p0} nebeneinander",
    "Campo {p0} em linha"
  ],
  [
    "An embed can have up to 25 fields.",
    "Un encart peut contenir jusqu’à 25 champs.",
    "Un mensaje insertado admite hasta 25 campos.",
    "Eine Einbettung kann bis zu 25 Felder enthalten.",
    "Uma incorporação pode ter até 25 campos."
  ],
  [
    "Publish to #{p0}?",
    "Publier dans #{p0} ?",
    "¿Publicar en #{p0}?",
    "In #{p0} veröffentlichen?",
    "Publicar em #{p0}?"
  ],
  [
    "Members who can see this channel can vote. The question and answers cannot be edited after publishing.",
    "Les personnes ayant accès au salon peuvent voter. La question et les réponses ne sont plus modifiables après publication.",
    "Quien vea el canal puede votar. La pregunta y las respuestas no se pueden editar tras publicar.",
    "Wer den Kanal sieht, kann abstimmen. Frage und Antworten sind nach Veröffentlichung nicht mehr änderbar.",
    "Quem vê o canal pode votar. A pergunta e as respostas não podem ser editadas após publicar."
  ],
  [
    "Cyro will post the message shown in your preview. This will not ping users or roles.",
    "Cyro publiera le message de l’aperçu sans notifier les utilisateurs ni les rôles.",
    "Cyro publicará el mensaje de la vista previa sin notificar a usuarios ni roles.",
    "Cyro veröffentlicht die Vorschau, ohne Nutzer oder Rollen zu benachrichtigen.",
    "O Cyro publicará a mensagem da prévia sem notificar usuários ou cargos."
  ],
  [
    "Demo preview complete; nothing was sent.",
    "Aperçu terminé ; rien n’a été envoyé.",
    "Vista previa completada; no se envió nada.",
    "Demo-Vorschau abgeschlossen; nichts gesendet.",
    "Prévia concluída; nada foi enviado."
  ],
  [
    "{error} Check the channel before starting another post.",
    "{error} Vérifiez le salon avant de créer une autre publication.",
    "{error} Revisa el canal antes de crear otra publicación.",
    "{error} Prüfe den Kanal, bevor du einen neuen Beitrag startest.",
    "{error} Confira o canal antes de iniciar outra publicação."
  ],
  [
    "Discord will stop accepting votes and finalize the results.",
    "Discord arrêtera les votes et finalisera les résultats.",
    "Discord cerrará la votación y finalizará los resultados.",
    "Discord beendet die Abstimmung und stellt das Ergebnis fest.",
    "O Discord encerrará a votação e finalizará os resultados."
  ],
  [
    "Choose a channel, write your question and add at least two answers. Review the preview before publishing.",
    "Choisissez un salon, écrivez la question et au moins deux réponses. Vérifiez l’aperçu avant de publier.",
    "Elige un canal, escribe la pregunta y al menos dos respuestas. Revisa la vista previa antes de publicar.",
    "Wähle einen Kanal, schreibe die Frage und mindestens zwei Antworten. Prüfe vor Veröffentlichung die Vorschau.",
    "Escolha um canal, escreva a pergunta e pelo menos duas respostas. Confira a prévia antes de publicar."
  ],
  [
    "Anyone who can see the channel can vote in Discord.",
    "Toute personne voyant le salon peut voter dans Discord.",
    "Quien pueda ver el canal puede votar en Discord.",
    "Wer den Kanal sehen kann, kann in Discord abstimmen.",
    "Quem pode ver o canal pode votar no Discord."
  ],
  [
    "Allow multiple answers if members can choose more than one.",
    "Autorisez plusieurs réponses si les membres peuvent en choisir plusieurs.",
    "Permite varias respuestas si los miembros pueden elegir más de una.",
    "Erlaube mehrere Antworten, wenn Mitglieder mehr als eine wählen dürfen.",
    "Permita várias respostas se os membros puderem escolher mais de uma."
  ],
  [
    "Voting closes after your chosen duration. Use End poll below to finish early.",
    "Le vote se ferme après la durée choisie. Utilisez Terminer le sondage ci-dessous pour finir plus tôt.",
    "La votación se cierra tras el plazo elegido. Usa Finalizar encuesta para acabar antes.",
    "Die Abstimmung endet nach der gewählten Dauer. Mit Umfrage beenden kannst du sie früher schließen.",
    "A votação termina após o prazo escolhido. Use Encerrar enquete abaixo para finalizar antes."
  ],
  [
    "You can also start a poll with ",
    "Vous pouvez aussi lancer un sondage avec ",
    "También puedes iniciar una encuesta con ",
    "Du kannst eine Umfrage auch starten mit ",
    "Você também pode iniciar uma enquete com "
  ],
  [
    " in Discord. The question and answers cannot be edited after publishing.",
    " dans Discord. La question et les réponses ne sont plus modifiables après publication.",
    " en Discord. La pregunta y las respuestas no pueden editarse tras publicar.",
    " in Discord. Frage und Antworten sind nach Veröffentlichung nicht mehr änderbar.",
    " no Discord. A pergunta e as respostas não podem ser editadas após publicar."
  ],
  [
    "Channel messages publish once. Use Sticky messages for a notice that returns after new conversation.",
    "Les messages de salon sont publiés une seule fois. Utilisez les messages persistants pour un rappel qui revient après de nouvelles conversations.",
    "Los mensajes de canal se publican una vez. Usa mensajes persistentes para avisos que vuelvan tras nuevas conversaciones.",
    "Kanalnachrichten werden einmal veröffentlicht. Verwende wiederkehrende Nachrichten für Hinweise nach neuer Unterhaltung.",
    "Mensagens de canal são publicadas uma vez. Use mensagens persistentes para avisos que retornam após novas conversas."
  ],
  [
    "Results remain on the original Discord poll.",
    "Les résultats restent sur le sondage Discord d’origine.",
    "Los resultados permanecen en la encuesta original de Discord.",
    "Ergebnisse bleiben in der ursprünglichen Discord-Umfrage.",
    "Os resultados ficam na enquete original do Discord."
  ],
  [
    "Text and layout preview. Linked images and markdown are rendered by Discord after posting.",
    "Aperçu du texte et de la disposition. Discord affiche les images liées et le Markdown après publication.",
    "Vista previa de texto y diseño. Discord muestra las imágenes enlazadas y el Markdown al publicar.",
    "Text- und Layoutvorschau. Discord stellt verlinkte Bilder und Markdown nach der Veröffentlichung dar.",
    "Prévia de texto e layout. O Discord exibe imagens vinculadas e Markdown após publicar."
  ],
  [
    "this server",
    "ce serveur",
    "este servidor",
    "diesem Server",
    "este servidor"
  ],
  [
    "Give Cyro a name and picture that fit your community. These changes apply only in this Discord server.",
    "Choisissez un nom et une image adaptés à votre communauté. Ces changements ne concernent que ce serveur Discord.",
    "Dale a Cyro un nombre e imagen para tu comunidad. Los cambios solo afectan a este servidor.",
    "Gib Cyro einen Namen und ein Bild für deine Community. Die Änderungen gelten nur auf diesem Discord-Server.",
    "Dê ao Cyro um nome e uma imagem para sua comunidade. As mudanças valem só neste servidor."
  ],
  [
    "Showing the current appearance in this server.",
    "Apparence actuelle dans ce serveur.",
    "Apariencia actual en este servidor.",
    "Aktuelles Aussehen auf diesem Server.",
    "Aparência atual neste servidor."
  ],
  [
    "{p0} · Ready to save",
    "{p0} · Prêt à enregistrer",
    "{p0} · Listo para guardar",
    "{p0} · Bereit zum Speichern",
    "{p0} · Pronto para salvar"
  ],
  [
    "The default picture will be restored when you save.",
    "L’image par défaut sera rétablie à l’enregistrement.",
    "La imagen predeterminada se restaurará al guardar.",
    "Das Standardbild wird beim Speichern wiederhergestellt.",
    "A imagem padrão será restaurada ao salvar."
  ],
  [
    "Your unsaved name and picture changes will be discarded.",
    "Les changements de nom et d’image non enregistrés seront perdus.",
    "Se perderán los cambios de nombre e imagen sin guardar.",
    "Nicht gespeicherte Namens- und Bildänderungen werden verworfen.",
    "As alterações de nome e imagem não salvas serão descartadas."
  ],
  [
    "Saved in {p0}: {p1} · {p2}",
    "Enregistré dans {p0} : {p1} · {p2}",
    "Guardado en {p0}: {p1} · {p2}",
    "Gespeichert auf {p0}: {p1} · {p2}",
    "Salvo em {p0}: {p1} · {p2}"
  ],
  [
    "Custom server picture",
    "Image propre au serveur",
    "Imagen personalizada del servidor",
    "Eigenes Serverbild",
    "Imagem personalizada do servidor"
  ],
  [
    "Default picture",
    "Image par défaut",
    "Imagen predeterminada",
    "Standardbild",
    "Imagem padrão"
  ],
  [
    "Checking the image before saving…",
    "Vérification de l’image avant enregistrement…",
    "Comprobando la imagen antes de guardar…",
    "Bild wird vor dem Speichern geprüft…",
    "Verificando a imagem antes de salvar…"
  ],
  [
    "Bot picture unavailable",
    "Image du bot indisponible",
    "Imagen del bot no disponible",
    "Bot-Bild nicht verfügbar",
    "Imagem do bot indisponível"
  ],
  [
    "Preview in {p0}",
    "Aperçu dans {p0}",
    "Vista previa en {p0}",
    "Vorschau auf {p0}",
    "Prévia em {p0}"
  ],
  [
    "Draft preview. Discord will show this appearance after you save.",
    "Aperçu du brouillon. Discord affichera ce profil après enregistrement.",
    "Borrador. Discord mostrará esta apariencia al guardar.",
    "Entwurfsvorschau. Discord zeigt dieses Aussehen nach dem Speichern.",
    "Prévia do rascunho. O Discord mostrará esta aparência após salvar."
  ],
  [
    "Current server appearance. The message above is only a preview.",
    "Profil actuel du serveur. Le message ci-dessus est un aperçu.",
    "Apariencia actual del servidor. El mensaje de arriba es solo una vista previa.",
    "Aktuelles Serverprofil. Die obige Nachricht ist nur eine Vorschau.",
    "Aparência atual do servidor. A mensagem acima é apenas uma prévia."
  ],
  [
    "Saved in this demo session. Discord was not changed.",
    "Enregistré dans cette démo. Discord n’a pas été modifié.",
    "Guardado en esta demo. Discord no cambió.",
    "In dieser Demo gespeichert. Discord wurde nicht verändert.",
    "Salvo nesta demonstração. O Discord não foi alterado."
  ],
  [
    "This server’s bot appearance has been saved.",
    "L’apparence du bot a été enregistrée pour ce serveur.",
    "Se guardó la apariencia del bot en este servidor.",
    "Das Bot-Aussehen wurde für diesen Server gespeichert.",
    "A aparência do bot foi salva neste servidor."
  ],
  [
    "Up to 32 characters. Leave blank to use the bot’s default name.",
    "32 caractères maximum. Laissez vide pour utiliser le nom par défaut.",
    "Hasta 32 caracteres. Déjalo vacío para usar el nombre predeterminado.",
    "Bis zu 32 Zeichen. Leer lassen für den Standardnamen.",
    "Até 32 caracteres. Deixe vazio para usar o nome padrão."
  ],
  [
    "Cyro needs the Change Nickname permission in this server to update its name. You can still change its picture.",
    "Cyro a besoin de Changer le pseudo pour modifier son nom ici. Vous pouvez quand même changer son image.",
    "Cyro necesita Cambiar apodo para actualizar su nombre aquí. Puedes cambiar su imagen igualmente.",
    "Cyro benötigt hier Nickname ändern. Sein Bild kannst du trotzdem ändern.",
    "O Cyro precisa de Alterar apelido para mudar seu nome aqui. Você ainda pode alterar a imagem."
  ],
  [
    "PNG, JPEG or WebP · Up to 2 MB and 4096 × 4096 pixels. A square image works best; Discord displays it in a circle.",
    "PNG, JPEG ou WebP · 2 Mo et 4096 × 4096 pixels maximum. Une image carrée est idéale ; Discord l’affiche en cercle.",
    "PNG, JPEG o WebP · Hasta 2 MB y 4096 × 4096 píxeles. Mejor una imagen cuadrada; Discord la muestra en un círculo.",
    "PNG, JPEG oder WebP · Bis 2 MB und 4096 × 4096 Pixel. Quadratische Bilder eignen sich am besten; Discord zeigt sie rund.",
    "PNG, JPEG ou WebP · Até 2 MB e 4096 × 4096 pixels. Prefira uma imagem quadrada; o Discord a exibe em círculo."
  ],
  [
    "Reset buttons prepare a change. The saved name and picture stay in place until you save.",
    "Les boutons de réinitialisation préparent une modification. Le nom et l’image actuels restent jusqu’à l’enregistrement.",
    "Los botones de restablecer preparan un cambio. El nombre e imagen actuales se conservan hasta guardar.",
    "Zurücksetzen bereitet nur eine Änderung vor. Name und Bild bleiben bis zum Speichern erhalten.",
    "Os botões de redefinição preparam uma mudança. O nome e a imagem atuais ficam até você salvar."
  ],
  [
    "Your custom name and picture appear on this bot’s messages and member profile in this server. Other servers keep their own settings. Cyro’s dashboard and application branding stay the same.",
    "Le nom et l’image personnalisés figurent sur les messages et le profil du bot dans ce serveur. Les autres serveurs gardent leurs réglages. L’identité du tableau de bord et de l’application Cyro ne change pas.",
    "El nombre e imagen personalizados aparecen en los mensajes y perfil del bot en este servidor. Los demás mantienen sus ajustes. La marca del panel y aplicación Cyro no cambia.",
    "Name und Bild erscheinen in Bot-Nachrichten und im Profil dieses Servers. Andere Server behalten ihre Einstellungen. Die Marke von Cyros Dashboard und App bleibt gleich.",
    "O nome e a imagem personalizados aparecem nas mensagens e no perfil do bot neste servidor. Outros servidores mantêm suas configurações. A marca do painel e do aplicativo Cyro não muda."
  ],
  [
    "Members submit ideas with /suggestion. Let them vote, then share your team’s decision.",
    "Les membres proposent des idées avec /suggestion. Laissez-les voter, puis partagez la décision de l’équipe.",
    "Los miembros proponen ideas con /suggestion. Deja que voten y comparte la decisión del equipo.",
    "Mitglieder schlagen mit /suggestion Ideen vor. Lasst sie abstimmen und teilt die Teamentscheidung.",
    "Os membros propõem ideias com /suggestion. Deixe-os votar e compartilhe a decisão da equipe."
  ],
  [
    "Members can use /suggestion to write an idea and open it for voting.",
    "Les membres utilisent /suggestion pour proposer une idée et ouvrir le vote.",
    "Los miembros usan /suggestion para proponer una idea y abrir la votación.",
    "Mitglieder können mit /suggestion eine Idee zur Abstimmung stellen.",
    "Os membros usam /suggestion para propor uma ideia e abrir a votação."
  ],
  [
    "Choose a text channel members can see. Cyro needs View Channel, Send Messages, Embed Links, and Read Message History.",
    "Choisissez un salon visible par les membres. Cyro a besoin de Voir le salon, Envoyer des messages, Intégrer des liens et Voir les anciens messages.",
    "Elige un canal visible para miembros. Cyro necesita Ver canal, Enviar mensajes, Insertar enlaces y Leer historial.",
    "Wähle einen sichtbaren Textkanal. Cyro benötigt Kanal ansehen, Nachrichten senden, Links einbetten und Nachrichtenverlauf anzeigen.",
    "Escolha um canal visível aos membros. O Cyro precisa de Ver canal, Enviar mensagens, Inserir links e Ver histórico."
  ],
  [
    "Per member. Use 0 for no cooldown, up to 1440 minutes (one day).",
    "Par membre. 0 désactive le délai ; maximum 1440 minutes (un jour).",
    "Por miembro. 0 sin espera; máximo 1440 minutos (un día).",
    "Pro Mitglied. 0 deaktiviert die Wartezeit; höchstens 1440 Minuten (ein Tag).",
    "Por membro. 0 sem intervalo; até 1440 minutos (um dia)."
  ],
  [
    "Choose a suggestions channel before enabling the board.",
    "Choisissez un salon de suggestions avant d’activer le tableau.",
    "Elige un canal de sugerencias antes de activar el tablón.",
    "Wähle vor dem Aktivieren einen Vorschlagskanal.",
    "Escolha um canal de sugestões antes de ativar o mural."
  ],
  [
    "Votes are refreshed when you open this page or choose Refresh votes.",
    "Les votes sont actualisés à l’ouverture de la page ou avec Actualiser les votes.",
    "Los votos se actualizan al abrir la página o pulsar Actualizar votos.",
    "Stimmen werden beim Öffnen oder mit Stimmen aktualisieren geladen.",
    "Os votos são atualizados ao abrir a página ou escolher Atualizar votos."
  ],
  [
    "Choose a channel, enable suggestions and save. Members can then use /suggestion in Discord to post their first idea.",
    "Choisissez un salon, activez les suggestions et enregistrez. Les membres peuvent ensuite publier leur première idée avec /suggestion.",
    "Elige un canal, activa sugerencias y guarda. Los miembros podrán proponer su primera idea con /suggestion.",
    "Wähle einen Kanal, aktiviere Vorschläge und speichere. Mitglieder können dann mit /suggestion ihre erste Idee einreichen.",
    "Escolha um canal, ative sugestões e salve. Os membros poderão publicar a primeira ideia com /suggestion."
  ],
  [
    "Choose another status or page, or refresh to check for new ideas.",
    "Choisissez un autre statut ou une autre page, ou actualisez les idées.",
    "Elige otro estado o página, o actualiza para buscar ideas nuevas.",
    "Wähle einen anderen Status oder eine andere Seite, oder aktualisiere.",
    "Escolha outro status ou página, ou atualize para ver novas ideias."
  ],
  [
    "Suggestion {p0}",
    "Suggestion {p0}",
    "Sugerencia {p0}",
    "Vorschlag {p0}",
    "Sugestão {p0}"
  ],
  [
    "{p0} upvotes",
    "{p0} votes pour",
    "{p0} votos a favor",
    "{p0} Dafür-Stimmen",
    "{p0} votos a favor"
  ],
  [
    "{p0} downvotes",
    "{p0} votes contre",
    "{p0} votos en contra",
    "{p0} Dagegen-Stimmen",
    "{p0} votos contra"
  ],
  [
    "Score {p0}{p1}",
    "Score {p0}{p1}",
    "Puntuación {p0}{p1}",
    "Punktzahl {p0}{p1}",
    "Pontuação {p0}{p1}"
  ],
  [
    "Delivery could not be confirmed. Check the suggestions channel before posting the idea again. Voting and staff decisions are unavailable until delivery is confirmed.",
    "L’envoi n’a pas pu être confirmé. Vérifiez le salon avant de republier l’idée. Votes et décisions sont indisponibles jusqu’à confirmation.",
    "El envío no pudo confirmarse. Revisa el canal antes de reenviar la idea. Votos y decisiones estarán desactivados hasta confirmarlo.",
    "Die Zustellung ist unbestätigt. Prüfe den Kanal vor erneutem Senden. Abstimmungen und Entscheidungen sind bis zur Bestätigung gesperrt.",
    "O envio não foi confirmado. Confira o canal antes de republicar a ideia. Votos e decisões ficam indisponíveis até confirmar."
  ],
  [
    "The result is saved here, but the Discord message update is still pending.",
    "Le résultat est enregistré ici, mais le message Discord attend sa mise à jour.",
    "El resultado está guardado aquí, pero el mensaje de Discord aún espera actualizarse.",
    "Das Ergebnis ist gespeichert, die Discord-Nachricht wartet noch auf Aktualisierung.",
    "O resultado foi salvo aqui, mas a mensagem do Discord ainda aguarda atualização."
  ],
  [
    "A final response closes voting and is shown on the Discord message.",
    "Une réponse finale ferme le vote et apparaît sur le message Discord.",
    "La respuesta final cierra la votación y aparece en Discord.",
    "Eine abschließende Antwort beendet die Abstimmung und erscheint in Discord.",
    "A resposta final encerra a votação e aparece na mensagem do Discord."
  ],
  [
    "Up to 1,000 characters. Visible to everyone who can see the suggestion.",
    "1000 caractères maximum. Visible par toutes les personnes ayant accès à la suggestion.",
    "Hasta 1000 caracteres. Visible para quien pueda ver la sugerencia.",
    "Bis zu 1000 Zeichen. Für alle mit Zugriff auf den Vorschlag sichtbar.",
    "Até 1000 caracteres. Visível para quem pode ver a sugestão."
  ],
  [
    "Close",
    "Fermer",
    "Cerrar",
    "Schließen",
    "Fechar"
  ],
  [
    "{p0} suggestion #{p1}?",
    "{p0} la suggestion nº {p1} ?",
    "¿{p0} la sugerencia #{p1}?",
    "Vorschlag #{p1}: {p0}?",
    "{p0} a sugestão #{p1}?"
  ],
  [
    "This closes voting and posts your response on the suggestion. The final decision cannot be changed.",
    "Le vote sera fermé et votre réponse publiée sur la suggestion. La décision finale ne peut plus être changée.",
    "Se cierra la votación y se publica tu respuesta. La decisión final no podrá cambiarse.",
    "Dies beendet die Abstimmung und veröffentlicht deine Antwort. Die endgültige Entscheidung ist nicht mehr änderbar.",
    "Isso encerra a votação e publica sua resposta. A decisão final não pode ser alterada."
  ],
  [
    "{p0} suggestion",
    "{p0} la suggestion",
    "{p0} sugerencia",
    "Vorschlag: {p0}",
    "{p0} sugestão"
  ],
  [
    "Demo response saved. Discord was not changed.",
    "Réponse de démo enregistrée. Discord n’a pas été modifié.",
    "Respuesta demo guardada. Discord no cambió.",
    "Demo-Antwort gespeichert. Discord wurde nicht geändert.",
    "Resposta de demonstração salva. O Discord não foi alterado."
  ],
  [
    "Checking the latest suggestions and votes…",
    "Vérification des dernières suggestions et des votes…",
    "Consultando las últimas sugerencias y votos…",
    "Neueste Vorschläge und Stimmen werden geprüft…",
    "Consultando as últimas sugestões e votos…"
  ],
  [
    "Page {p0} refreshed {p1}. Draft notes are kept when you change pages.",
    "Page {p0} actualisée à {p1}. Les brouillons de notes sont conservés entre les pages.",
    "Página {p0} actualizada a las {p1}. Los borradores se conservan al cambiar de página.",
    "Seite {p0} um {p1} aktualisiert. Notizentwürfe bleiben beim Seitenwechsel erhalten.",
    "Página {p0} atualizada às {p1}. Rascunhos de notas são mantidos ao trocar de página."
  ],
  [
    "{p0} The previous results are still shown. Choose Refresh votes to try again.",
    "{p0} Les anciens résultats sont toujours affichés. Choisissez Actualiser les votes pour réessayer.",
    "{p0} Se muestran los resultados anteriores. Pulsa Actualizar votos para reintentar.",
    "{p0} Die bisherigen Ergebnisse bleiben sichtbar. Wähle Stimmen aktualisieren für einen neuen Versuch.",
    "{p0} Os resultados anteriores continuam visíveis. Escolha Atualizar votos para tentar novamente."
  ],
  [
    "Members use /suggestion in Discord. Each idea gets its own numbered post with Upvote, Downvote, and Remove vote buttons.",
    "Les membres utilisent /suggestion dans Discord. Chaque idée reçoit un message numéroté avec les boutons Pour, Contre et Retirer mon vote.",
    "Los miembros usan /suggestion en Discord. Cada idea recibe una publicación numerada con A favor, En contra y Retirar voto.",
    "Mitglieder nutzen /suggestion in Discord. Jede Idee erhält einen nummerierten Beitrag mit Dafür, Dagegen und Stimme entfernen.",
    "Os membros usam /suggestion no Discord. Cada ideia ganha uma publicação numerada com A favor, Contra e Remover voto."
  ],
  [
    "One vote per member. Choose the other button to change it.",
    "Un vote par membre. Choisissez l’autre bouton pour changer votre vote.",
    "Un voto por miembro. Elige el otro botón para cambiarlo.",
    "Eine Stimme pro Mitglied. Mit dem anderen Button änderst du sie.",
    "Um voto por membro. Escolha o outro botão para mudar."
  ],
  [
    "Staff review the ideas below and leave a final response.",
    "L’équipe examine les idées ci-dessous et laisse une réponse finale.",
    "El equipo revisa las ideas de abajo y da una respuesta final.",
    "Das Team prüft die Ideen unten und gibt eine abschließende Antwort.",
    "A equipe analisa as ideias abaixo e deixa uma resposta final."
  ],
  [
    "Accepting, declining, or closing an idea ends voting.",
    "Accepter, refuser ou fermer une idée termine le vote.",
    "Aceptar, rechazar o cerrar una idea termina la votación.",
    "Annehmen, Ablehnen oder Schließen beendet die Abstimmung.",
    "Aceitar, recusar ou fechar uma ideia encerra a votação."
  ],
  [
    "Members need access to the suggestions channel to vote. Dashboard staff can review suggestions here. The server owner can restrict /suggestion to selected roles in Access & commands.",
    "Les membres doivent accéder au salon pour voter. L’équipe du tableau de bord peut examiner les suggestions ici. Le propriétaire peut limiter /suggestion à certains rôles dans Accès et commandes.",
    "Los miembros necesitan acceso al canal para votar. El equipo puede revisar ideas aquí. El propietario puede limitar /suggestion a ciertos roles en Acceso y comandos.",
    "Mitglieder brauchen Kanalzugriff zum Abstimmen. Dashboard-Mitarbeiter prüfen Vorschläge hier. Der Inhaber kann /suggestion unter Zugriff und Befehle auf Rollen beschränken.",
    "Membros precisam de acesso ao canal para votar. A equipe do painel analisa sugestões aqui. O dono pode limitar /suggestion a cargos em Acesso e comandos."
  ],
  [
    "Up to 100 ideas per page, newest first. Totals above include all retained ideas.",
    "100 idées par page maximum, les plus récentes d’abord. Les totaux incluent toutes les idées conservées.",
    "Hasta 100 ideas por página, recientes primero. Los totales incluyen todas las ideas guardadas.",
    "Bis zu 100 Ideen pro Seite, neueste zuerst. Die Summen umfassen alle gespeicherten Ideen.",
    "Até 100 ideias por página, mais recentes primeiro. Os totais incluem todas as ideias mantidas."
  ],
  [
    "Ideas and staff responses. Members cast their votes in Discord.",
    "Idées et réponses de l’équipe. Les membres votent dans Discord.",
    "Ideas y respuestas del equipo. Los miembros votan en Discord.",
    "Ideen und Teamantworten. Mitglieder stimmen in Discord ab.",
    "Ideias e respostas da equipe. Os membros votam no Discord."
  ],
  [
    "Reward members who put your community’s text in their Discord custom status.",
    "Récompensez les membres qui affichent le texte de votre communauté dans leur statut Discord.",
    "Premia a quienes muestran el texto de tu comunidad en su estado personalizado.",
    "Belohne Mitglieder, die deinen Community-Text in ihrem Discord-Status tragen.",
    "Recompense quem coloca o texto da comunidade no status personalizado do Discord."
  ],
  [
    "Assignments update as Cyro receives member statuses. Refresh to check the latest totals.",
    "Les attributions changent à la réception des statuts. Actualisez pour voir les derniers totaux.",
    "Las asignaciones cambian al recibir estados. Actualiza para ver los totales recientes.",
    "Zuweisungen ändern sich beim Empfang von Statusdaten. Aktualisiere für aktuelle Zahlen.",
    "As atribuições mudam ao receber status. Atualize para ver os totais recentes."
  ],
  [
    "Give the selected role when a custom status matches. Remove it when that status no longer matches.",
    "Attribuer le rôle si le statut correspond, puis le retirer s’il ne correspond plus.",
    "Otorga el rol cuando el estado coincida y retíralo cuando deje de coincidir.",
    "Rolle vergeben, wenn der Status passt, und entfernen, wenn er nicht mehr passt.",
    "Atribua o cargo quando o status corresponder e remova quando deixar de corresponder."
  ],
  [
    "A phrase, your server name, or an invite link. Up to 128 characters; spaces at the ends are trimmed when saved.",
    "Une phrase, le nom du serveur ou un lien d’invitation. 128 caractères maximum ; les espaces aux extrémités sont retirés à l’enregistrement.",
    "Una frase, nombre del servidor o invitación. Hasta 128 caracteres; se recortan espacios al guardar.",
    "Phrase, Servername oder Einladungslink. Bis 128 Zeichen; Leerzeichen am Anfang und Ende werden beim Speichern entfernt.",
    "Uma frase, nome do servidor ou convite. Até 128 caracteres; espaços nas pontas são removidos ao salvar."
  ],
  [
    "discord.gg/your-community",
    "discord.gg/votre-communaute",
    "discord.gg/tu-comunidad",
    "discord.gg/deine-community",
    "discord.gg/sua-comunidade"
  ],
  [
    "Unavailable role · {p0}",
    "Rôle indisponible · {p0}",
    "Rol no disponible · {p0}",
    "Nicht verfügbare Rolle · {p0}",
    "Cargo indisponível · {p0}"
  ],
  [
    "Require the same uppercase and lowercase letters. Leave off to match either.",
    "Exiger les mêmes majuscules et minuscules. Désactivez pour ignorer la casse.",
    "Exige las mismas mayúsculas y minúsculas. Desactívalo para ignorarlas.",
    "Gleiche Groß- und Kleinschreibung verlangen. Ausschalten, um sie zu ignorieren.",
    "Exige as mesmas maiúsculas e minúsculas. Desative para ignorar a diferença."
  ],
  [
    "A sample only. This does not change anyone’s status or roles.",
    "Simple exemple, sans changement de statut ni de rôle.",
    "Solo ejemplo; no cambia estados ni roles.",
    "Nur ein Beispiel. Ändert weder Status noch Rollen.",
    "Apenas exemplo; não altera status nem cargos."
  ],
  [
    "Enter your status text to try the rule.",
    "Saisissez le texte de statut pour tester la règle.",
    "Escribe el texto del estado para probar la regla.",
    "Gib einen Statustext ein, um die Regel zu testen.",
    "Digite o texto do status para testar a regra."
  ],
  [
    "Matches your rule. This member would qualify.",
    "Correspond à la règle. Ce membre serait admissible.",
    "Coincide con la regla. Este miembro cumpliría los requisitos.",
    "Passt zur Regel. Dieses Mitglied wäre berechtigt.",
    "Corresponde à regra. Este membro seria elegível."
  ],
  [
    "Text matches. Choose a reward role to finish setup.",
    "Le texte correspond. Choisissez un rôle pour terminer.",
    "El texto coincide. Elige un rol para terminar.",
    "Text passt. Wähle eine Belohnungsrolle zum Abschließen.",
    "O texto corresponde. Escolha um cargo para concluir."
  ],
  [
    "Does not match. A role given by this rule would be removed.",
    "Ne correspond pas. Un rôle attribué par cette règle serait retiré.",
    "No coincide. Se retiraría un rol concedido por esta regla.",
    "Passt nicht. Eine durch diese Regel vergebene Rolle würde entfernt.",
    "Não corresponde. Um cargo atribuído por esta regra seria removido."
  ],
  [
    "Status tracking is not enabled for this bot yet. The bot operator needs to enable Discord’s Presence Intent and restart Cyro. You can save your rule while it is switched off.",
    "Le suivi des statuts n’est pas activé. L’opérateur doit activer Presence Intent dans Discord et redémarrer Cyro. Vous pouvez enregistrer la règle désactivée.",
    "El seguimiento no está activo. El operador debe activar Presence Intent y reiniciar Cyro. Puedes guardar la regla desactivada.",
    "Statusverfolgung ist noch nicht aktiv. Der Betreiber muss Discord Presence Intent aktivieren und Cyro neu starten. Die ausgeschaltete Regel lässt sich speichern.",
    "O acompanhamento de status não está ativo. O operador precisa ativar Presence Intent no Discord e reiniciar o Cyro. Você pode salvar a regra desativada."
  ],
  [
    "Checking the latest role assignments…",
    "Vérification des dernières attributions…",
    "Comprobando las últimas asignaciones…",
    "Neueste Rollenzuweisungen werden geprüft…",
    "Consultando as últimas atribuições…"
  ],
  [
    "Status refreshed {p0}. Your rule draft has been kept.",
    "Statut actualisé à {p0}. Votre brouillon de règle est conservé.",
    "Estado actualizado a las {p0}. El borrador se conserva.",
    "Status um {p0} aktualisiert. Dein Regelentwurf bleibt erhalten.",
    "Status atualizado às {p0}. Seu rascunho foi mantido."
  ],
  [
    "{p0} The previous totals are still shown.",
    "{p0} Les anciens totaux restent affichés.",
    "{p0} Se muestran los totales anteriores.",
    "{p0} Die bisherigen Summen bleiben sichtbar.",
    "{p0} Os totais anteriores continuam visíveis."
  ],
  [
    "Use a dedicated role below Cyro’s highest role. Staff roles, dashboard access roles, and managed integration roles cannot be rewards.",
    "Utilisez un rôle dédié sous le rôle le plus élevé de Cyro. Les rôles d’équipe, d’accès au tableau de bord et d’intégration ne peuvent pas servir de récompenses.",
    "Usa un rol dedicado bajo el mayor rol de Cyro. No uses roles del equipo, de acceso al panel ni de integraciones.",
    "Nutze eine eigene Rolle unter Cyros höchster Rolle. Team-, Dashboard- und verwaltete Integrationsrollen können keine Belohnungen sein.",
    "Use um cargo dedicado abaixo do mais alto do Cyro. Cargos da equipe, de acesso ao painel e de integrações não podem ser recompensas."
  ],
  [
    "Contains allows other words around your text. Exactly requires the whole custom status to match.",
    "Contient permet du texte autour de votre phrase. Exactement exige que tout le statut corresponde.",
    "Contiene permite texto alrededor. Exactamente exige que coincida todo el estado.",
    "Enthält erlaubt zusätzlichen Text. Exakt verlangt, dass der gesamte Status übereinstimmt.",
    "Contém permite texto ao redor. Exatamente exige que todo o status corresponda."
  ],
  [
    "Discord does not reveal their custom status. Keeping the role avoids removing it just because someone goes offline.",
    "Discord ne révèle pas leur statut. Conserver le rôle évite de le retirer simplement quand quelqu’un se déconnecte.",
    "Discord no revela su estado. Conservar el rol evita retirarlo solo por desconectarse.",
    "Discord zeigt ihren Status nicht. Rolle behalten verhindert, dass sie nur durch Offlinegehen entfernt wird.",
    "O Discord não revela o status deles. Manter o cargo evita removê-lo só porque alguém ficou offline."
  ],
  [
    "For online members, clearing the custom status or hiding it from the bot is treated as no match. Only Discord custom statuses count; games, music, and the About Me profile text do not.",
    "Pour les membres en ligne, effacer ou masquer le statut au bot compte comme une non-correspondance. Seuls les statuts personnalisés comptent, pas les jeux, la musique ni À propos.",
    "Para miembros en línea, borrar u ocultar el estado al bot cuenta como no coincidente. Solo cuentan estados personalizados, no juegos, música ni Acerca de mí.",
    "Bei Online-Mitgliedern gilt ein gelöschter oder versteckter Status als nicht passend. Nur benutzerdefinierte Status zählen, keine Spiele, Musik oder Über-mich-Texte.",
    "Para membros online, limpar ou ocultar o status do bot conta como não correspondente. Só status personalizados contam, não jogos, música ou Sobre mim."
  ],
  [
    "Switch this rule off to save it until the bot operator enables status tracking.",
    "Désactivez la règle pour l’enregistrer avant que l’opérateur active le suivi.",
    "Desactiva la regla para guardarla hasta que el operador active el seguimiento.",
    "Schalte die Regel zum Speichern aus, bis der Betreiber die Statusverfolgung aktiviert.",
    "Desative a regra para salvar até o operador ativar o acompanhamento."
  ],
  [
    "Enter status text and choose a reward role before enabling this rule.",
    "Entrez un texte et choisissez un rôle avant d’activer la règle.",
    "Escribe el texto y elige un rol antes de activar la regla.",
    "Gib Statustext und Belohnungsrolle an, bevor du die Regel aktivierst.",
    "Digite o texto e escolha um cargo antes de ativar a regra."
  ],
  [
    "Settings saved. Role updates run in the background; refresh status to check progress.",
    "Réglages enregistrés. Les rôles se mettent à jour en arrière-plan ; actualisez le statut pour suivre.",
    "Ajustes guardados. Los roles se actualizan en segundo plano; actualiza para ver el progreso.",
    "Gespeichert. Rollen werden im Hintergrund aktualisiert; lade den Status für den Fortschritt neu.",
    "Configurações salvas. Os cargos são atualizados em segundo plano; atualize o status para acompanhar."
  ],
  [
    "Try the text a member might use.",
    "Essayez un texte qu’un membre pourrait utiliser.",
    "Prueba un texto que podría usar un miembro.",
    "Teste einen möglichen Mitgliedsstatus.",
    "Teste um texto que um membro usaria."
  ],
  [
    "A role for supporters",
    "Un rôle pour les soutiens",
    "Un rol para quienes apoyan",
    "Eine Rolle für Unterstützer",
    "Um cargo para apoiadores"
  ],
  [
    "Create a role just for this reward. Cyro removes only roles that this feature gave out. Roles members already had are left alone.",
    "Créez un rôle dédié. Cyro retire uniquement les rôles attribués par cette fonction et conserve ceux déjà possédés.",
    "Crea un rol exclusivo. Cyro solo retira roles otorgados por esta función; conserva los que ya tenían.",
    "Erstelle eine eigene Rolle. Cyro entfernt nur Rollen, die diese Funktion vergeben hat; bestehende Rollen bleiben erhalten.",
    "Crie um cargo dedicado. O Cyro remove só cargos dados por esta função; os que já existiam são mantidos."
  ],
  [
    "Disabling the rule or choosing a different role removes its earlier assignments in the background.",
    "Désactiver la règle ou changer de rôle retire les anciennes attributions en arrière-plan.",
    "Desactivar la regla o cambiar el rol retira las asignaciones anteriores en segundo plano.",
    "Deaktivieren oder Rollenwechsel entfernt bisherige Zuweisungen im Hintergrund.",
    "Desativar a regra ou trocar o cargo remove atribuições anteriores em segundo plano."
  ],
  [
    "Totals for roles managed by this feature in this server.",
    "Totaux des rôles gérés par cette fonction dans ce serveur.",
    "Totales de roles gestionados por esta función en este servidor.",
    "Summen der durch diese Funktion verwalteten Rollen dieses Servers.",
    "Totais dos cargos gerenciados por esta função neste servidor."
  ],
  [
    "Give members a place to share a thought without putting their name on the post.",
    "Un endroit où partager une pensée sans afficher son nom.",
    "Un lugar para compartir una idea sin mostrar el nombre.",
    "Ein Ort für Gedanken, ohne den Namen zu veröffentlichen.",
    "Um lugar para compartilhar um pensamento sem mostrar o nome."
  ],
  [
    "Use a text channel members can read. Cyro needs View Channel, Send Messages, Embed Links, and Read Message History.",
    "Utilisez un salon lisible par les membres. Cyro a besoin de Voir le salon, Envoyer des messages, Intégrer des liens et Voir les anciens messages.",
    "Usa un canal que los miembros puedan leer. Cyro necesita Ver canal, Enviar mensajes, Insertar enlaces y Leer historial.",
    "Nutze einen für Mitglieder lesbaren Kanal. Cyro benötigt Kanal ansehen, Nachrichten senden, Links einbetten und Nachrichtenverlauf anzeigen.",
    "Use um canal que os membros possam ler. O Cyro precisa de Ver canal, Enviar mensagens, Inserir links e Ver histórico."
  ],
  [
    "Members can use /confess to publish an anonymous embed in the channel you choose.",
    "Les membres utilisent /confess pour publier un encart anonyme dans le salon choisi.",
    "Los miembros usan /confess para publicar un mensaje anónimo en el canal elegido.",
    "Mitglieder veröffentlichen mit /confess eine anonyme Einbettung im gewählten Kanal.",
    "Os membros usam /confess para publicar uma mensagem anônima no canal escolhido."
  ],
  [
    "Per member, from 10 to 3,600 seconds. A cooldown helps keep the board readable.",
    "Par membre, de 10 à 3600 secondes. Le délai garde le tableau lisible.",
    "Por miembro, de 10 a 3600 segundos. La espera mantiene el tablón legible.",
    "Pro Mitglied, 10 bis 3600 Sekunden. Eine Wartezeit hält das Board lesbar.",
    "Por membro, de 10 a 3600 segundos. O intervalo ajuda a manter o mural legível."
  ],
  [
    "Only delivery totals appear here. Read and moderate confession posts in Discord.",
    "Seuls les totaux d’envoi figurent ici. Lisez et modérez les confessions dans Discord.",
    "Aquí solo aparecen totales de envíos. Lee y modera las confesiones en Discord.",
    "Hier stehen nur Zustellsummen. Lies und moderiere Geständnisse in Discord.",
    "Só os totais de envio aparecem aqui. Leia e modere confissões no Discord."
  ],
  [
    "Check Discord before repeating a submission",
    "Vérifiez Discord avant de renvoyer",
    "Revisa Discord antes de reenviar",
    "Vor erneutem Senden Discord prüfen",
    "Confira o Discord antes de reenviar"
  ],
  [
    "Totals refreshed {p0}. Your settings draft has been kept.",
    "Totaux actualisés à {p0}. Votre brouillon est conservé.",
    "Totales actualizados a las {p0}. Tu borrador se conserva.",
    "Summen um {p0} aktualisiert. Dein Entwurf bleibt erhalten.",
    "Totais atualizados às {p0}. Seu rascunho foi mantido."
  ],
  [
    "Choose a confessions channel before enabling the board.",
    "Choisissez un salon de confessions avant d’activer le tableau.",
    "Elige un canal de confesiones antes de activar el tablón.",
    "Wähle vor dem Aktivieren einen Geständniskanal.",
    "Escolha um canal de confissões antes de ativar o mural."
  ],
  [
    "I joined for the game nights, but stayed for the people.",
    "Je suis venu pour les soirées jeux, mais je suis resté pour les gens.",
    "Vine por las noches de juegos, pero me quedé por la gente.",
    "Ich kam für die Spieleabende und blieb wegen der Leute.",
    "Entrei pelas noites de jogos, mas fiquei pelas pessoas."
  ],
  [
    "Sample preview. Saving these settings does not publish a message.",
    "Exemple d’aperçu. Enregistrer ces réglages ne publie aucun message.",
    "Ejemplo de vista previa. Guardar estos ajustes no publica mensajes.",
    "Beispielvorschau. Speichern veröffentlicht keine Nachricht.",
    "Prévia de exemplo. Salvar estas configurações não publica mensagens."
  ],
  [
    "Members use /confess and enter their confession in Discord. Cyro confirms privately and posts an embed in your chosen channel.",
    "Les membres saisissent leur confession avec /confess dans Discord. Cyro confirme en privé puis publie un encart dans le salon choisi.",
    "Los miembros escriben con /confess en Discord. Cyro confirma en privado y publica el mensaje en el canal elegido.",
    "Mitglieder schreiben mit /confess in Discord. Cyro bestätigt privat und veröffentlicht eine Einbettung im gewählten Kanal.",
    "Os membros escrevem com /confess no Discord. O Cyro confirma em privado e publica no canal escolhido."
  ],
  [
    "Keep identifying details out of confessions. Your community rules still apply; staff can remove posts in Discord.",
    "Évitez les détails identifiants. Les règles de votre communauté s’appliquent ; l’équipe peut supprimer les publications dans Discord.",
    "Evita datos que identifiquen. Se aplican las normas de la comunidad; el equipo puede borrar publicaciones en Discord.",
    "Vermeide identifizierende Angaben. Community-Regeln gelten weiterhin; das Team kann Beiträge in Discord löschen.",
    "Evite detalhes que identifiquem pessoas. As regras da comunidade valem; a equipe pode remover publicações no Discord."
  ],
  [
    "Names are left off public posts. Discord still processes the command and knows which account submitted it.",
    "Les noms sont absents des publications publiques. Discord traite la commande et sait quel compte l’a envoyée.",
    "Las publicaciones públicas no muestran nombres. Discord procesa la orden y sabe qué cuenta la envió.",
    "Öffentliche Beiträge zeigen keine Namen. Discord verarbeitet den Befehl und kennt das absendende Konto.",
    "As publicações públicas não mostram nomes. O Discord processa o comando e sabe qual conta enviou."
  ],
  [
    "{count} room creation requests await confirmation. Cyro keeps each owner’s slot reserved to prevent duplicates.",
    "{count} créations de salon attendent confirmation. Cyro réserve la place de chaque propriétaire pour éviter les doublons.",
    "{count} solicitudes de sala esperan confirmación. Cyro reserva el cupo de cada propietario para evitar duplicados.",
    "{count} Raumerstellungen warten auf Bestätigung. Cyro reserviert den Platz jedes Besitzers gegen Duplikate.",
    "{count} criações de sala aguardam confirmação. O Cyro reserva a vaga de cada dono para evitar duplicatas."
  ],
  [
    "{p0} Previous room activity is still shown.",
    "{p0} L’activité précédente des salons reste affichée.",
    "{p0} Se muestra la actividad anterior de las salas.",
    "{p0} Die bisherige Raumaktivität bleibt sichtbar.",
    "{p0} A atividade anterior das salas continua visível."
  ],
  [
    "Join the lobby, then open the text chat attached to your new voice room. Cyro’s control panel is waiting there. Joining the lobby again returns you to your existing room.",
    "Rejoignez le hall puis ouvrez le chat de votre nouveau salon vocal : le panneau Cyro s’y trouve. Rejoindre le hall à nouveau vous ramène dans votre salon existant.",
    "Entra al vestíbulo y abre el chat de tu nueva sala: allí está el panel de Cyro. Volver al vestíbulo te devuelve a tu sala existente.",
    "Betritt die Lobby und öffne den Textchat deines neuen Sprachraums. Dort wartet Cyros Panel. Erneutes Betreten der Lobby führt zu deinem bestehenden Raum.",
    "Entre no lobby e abra o chat da nova sala de voz: o painel do Cyro estará lá. Entrar de novo no lobby retorna à sua sala existente."
  ],
  [
    " stops new members joining. ",
    " empêche de nouvelles personnes de rejoindre. ",
    " impide nuevas entradas. ",
    " verhindert neue Beitritte. ",
    " impede novas entradas. "
  ],
  [
    " restores normal access.",
    " rétablit l’accès normal.",
    " restaura el acceso normal.",
    " stellt normalen Zugriff wieder her.",
    " restaura o acesso normal."
  ],
  [
    " opens a name form. ",
    " ouvre un formulaire de nom. ",
    " abre un formulario para el nombre. ",
    " öffnet ein Namensformular. ",
    " abre um formulário de nome. "
  ],
  [
    " lets you choose 1–99 people, or 0 for no limit.",
    " permet de choisir 1 à 99 personnes, ou 0 sans limite.",
    " permite elegir de 1 a 99 personas, o 0 sin límite.",
    " erlaubt 1–99 Personen oder 0 ohne Begrenzung.",
    " permite escolher de 1 a 99 pessoas, ou 0 sem limite."
  ],
  [
    " opens a searchable member picker to let someone join a locked room. They still need access to the room’s category.",
    " ouvre une recherche de membre pour autoriser l’accès à un salon verrouillé. Le membre doit aussi accéder à sa catégorie.",
    " abre un selector con búsqueda para dar acceso a una sala bloqueada. El miembro también necesita acceso a la categoría.",
    " öffnet eine Mitgliedersuche für den Zutritt zu gesperrten Räumen. Der Zugriff auf die Kategorie ist weiterhin nötig.",
    " abre uma busca de membros para permitir entrada numa sala trancada. O membro ainda precisa de acesso à categoria."
  ],
  [
    " opens a member picker to disconnect someone from this room. It does not ban them or stop them rejoining if they still have access. ",
    " ouvre un sélecteur pour déconnecter un membre du salon. Cela ne le bannit pas et ne bloque pas son retour s’il garde l’accès. ",
    " abre un selector para desconectar a alguien de la sala. No lo expulsa del servidor ni impide que vuelva si tiene acceso. ",
    " öffnet eine Mitgliederauswahl zum Trennen aus diesem Raum. Kein Bann; mit Zugriffsrechten kann die Person wiederkommen. ",
    " abre um seletor para desconectar alguém da sala. Não bane nem impede o retorno se a pessoa ainda tiver acesso. "
  ],
  [
    " blocks future joins without disconnecting them.",
    " bloque les futurs accès sans déconnecter le membre.",
    " bloquea futuras entradas sin desconectar al miembro.",
    " sperrt künftige Beitritte, ohne die Person zu trennen.",
    " bloqueia entradas futuras sem desconectar a pessoa."
  ],
  [
    "Stay connected to your room to use its buttons or commands. Locks keep the channel visible according to the category settings. Discord administrators can bypass locks.",
    "Restez dans votre salon pour utiliser ses boutons et commandes. Le verrouillage conserve la visibilité définie par la catégorie. Les administrateurs Discord peuvent contourner le verrouillage.",
    "Quédate en tu sala para usar sus botones y comandos. El bloqueo mantiene la visibilidad de la categoría. Los administradores pueden evitarlo.",
    "Bleibe für Buttons und Befehle im Raum. Sperren ändern die Sichtbarkeit der Kategorie nicht. Discord-Administratoren können Sperren umgehen.",
    "Fique na sala para usar botões e comandos. Trancar mantém a visibilidade da categoria. Administradores do Discord podem ignorar o bloqueio."
  ],
  [
    "Cyro needs View Channel, Connect, Manage Channels, Manage Permissions, and Move Members in the category. In the lobby it needs View Channel, Connect, and Move Members.",
    "Dans la catégorie, Cyro a besoin de Voir le salon, Se connecter, Gérer les salons, Gérer les permissions et Déplacer des membres. Dans le hall : Voir le salon, Se connecter et Déplacer des membres.",
    "En la categoría, Cyro necesita Ver canal, Conectar, Gestionar canales, Gestionar permisos y Mover miembros. En el vestíbulo: Ver canal, Conectar y Mover miembros.",
    "In der Kategorie braucht Cyro Kanal ansehen, Verbinden, Kanäle verwalten, Berechtigungen verwalten und Mitglieder verschieben. In der Lobby: Kanal ansehen, Verbinden und Mitglieder verschieben.",
    "Na categoria, o Cyro precisa de Ver canal, Conectar, Gerenciar canais, Gerenciar permissões e Mover membros. No lobby: Ver canal, Conectar e Mover membros."
  ],
  [
    "The control panel also needs Send Messages, Embed Links and Read Message History in the room’s text chat. Members need View Channel and Read Message History to find it.",
    "Le panneau nécessite aussi Envoyer des messages, Intégrer des liens et Voir les anciens messages dans le chat du salon. Les membres ont besoin de Voir le salon et Voir les anciens messages.",
    "El panel necesita Enviar mensajes, Insertar enlaces y Leer historial en el chat de la sala. Los miembros necesitan Ver canal y Leer historial.",
    "Das Panel braucht außerdem Nachrichten senden, Links einbetten und Nachrichtenverlauf anzeigen im Raumchat. Mitglieder brauchen Kanal ansehen und Nachrichtenverlauf anzeigen.",
    "O painel também precisa de Enviar mensagens, Inserir links e Ver histórico no chat da sala. Membros precisam de Ver canal e Ver histórico."
  ],
  [
    "Room owners do not receive server-wide management permissions. Category settings are copied when each room is created; later category edits do not automatically sync to that room.",
    "Les propriétaires ne reçoivent pas de permissions globales. Les réglages de catégorie sont copiés à la création ; les modifications suivantes ne se synchronisent pas automatiquement.",
    "Los propietarios no reciben permisos globales. Los ajustes de categoría se copian al crear la sala; cambios posteriores no se sincronizan automáticamente.",
    "Raumbesitzer erhalten keine serverweiten Verwaltungsrechte. Kategorieeinstellungen werden bei Erstellung kopiert; spätere Änderungen nicht automatisch übertragen.",
    "Os donos das salas não recebem permissões globais. As configurações da categoria são copiadas na criação; mudanças posteriores não sincronizam automaticamente."
  ],
  [
    "Try “Bot bugs”, “Server issues”, or a category for each game or script. Each can use its own channel.",
    "Essayez « Bugs du bot », « Problèmes du serveur », ou une catégorie par jeu ou script. Chacune peut utiliser son propre salon.",
    "Prueba «Errores del bot», «Problemas del servidor» o una categoría por juego o script. Cada una puede tener su canal.",
    "Zum Beispiel „Bot-Fehler“, „Serverprobleme“ oder je eine Kategorie für Spiele und Skripte. Jede kann einen eigenen Kanal nutzen.",
    "Tente “Bugs do bot”, “Problemas do servidor” ou uma categoria por jogo ou script. Cada uma pode ter seu canal."
  ],
  [
    "Choose a channel, write the message, and decide how often it should return.",
    "Choisissez un salon, rédigez le message et décidez à quelle fréquence il revient.",
    "Elige un canal, escribe el mensaje y decide con qué frecuencia vuelve.",
    "Wähle einen Kanal, schreibe die Nachricht und lege die Wiederholung fest.",
    "Escolha um canal, escreva a mensagem e decida com que frequência ela retorna."
  ],
  [
    "Existing bug reports stay in the history. Members will no longer see this category after you save.",
    "Les rapports existants restent dans l’historique. Après enregistrement, les membres ne verront plus cette catégorie.",
    "Los informes existentes siguen en el historial. Tras guardar, los miembros ya no verán la categoría.",
    "Bestehende Meldungen bleiben im Verlauf. Nach dem Speichern sehen Mitglieder diese Kategorie nicht mehr.",
    "Os relatos existentes ficam no histórico. Após salvar, os membros não verão mais esta categoria."
  ],
  [
    "Saving removes Cyro’s tracked reminder from this channel. Other messages are left alone.",
    "Enregistrer retire le rappel suivi par Cyro de ce salon. Les autres messages restent intacts.",
    "Guardar retira el recordatorio de Cyro de este canal. Los demás mensajes no cambian.",
    "Speichern entfernt Cyros erfasste Erinnerung aus dem Kanal. Andere Nachrichten bleiben unverändert.",
    "Salvar remove o lembrete rastreado pelo Cyro deste canal. Outras mensagens ficam intactas."
  ],
  [
    "Members choose this with /bugreport category. Keep names distinct.",
    "Les membres choisissent avec /bugreport category. Utilisez des noms distincts.",
    "Los miembros eligen con /bugreport category. Usa nombres distintos.",
    "Mitglieder wählen mit /bugreport category. Verwende eindeutige Namen.",
    "Os membros escolhem com /bugreport category. Use nomes distintos."
  ],
  [
    "Reports include the member’s name. Choose who can read this channel in Discord; public and private channels both work.",
    "Les rapports incluent le nom du membre. Réglez la lecture du salon dans Discord ; les salons publics et privés conviennent.",
    "Los informes incluyen el nombre. Configura quién lee el canal en Discord; sirven canales públicos y privados.",
    "Meldungen enthalten den Mitgliedsnamen. Lege den Lesezugriff in Discord fest; öffentliche und private Kanäle funktionieren.",
    "Os relatos incluem o nome do membro. Defina quem lê o canal no Discord; canais públicos e privados funcionam."
  ],
  [
    "Starts after new member messages reach the threshold below.",
    "Commence lorsque les nouveaux messages de membres atteignent le seuil ci-dessous.",
    "Empieza cuando los nuevos mensajes alcanzan el umbral indicado.",
    "Startet, sobald neue Mitgliedsnachrichten den folgenden Schwellenwert erreichen.",
    "Começa quando novas mensagens de membros atingem o limite abaixo."
  ],
  [
    "Use one sticky message per channel.",
    "Un message persistant par salon.",
    "Un mensaje persistente por canal.",
    "Eine wiederkehrende Nachricht pro Kanal.",
    "Uma mensagem persistente por canal."
  ],
  [
    "A quick reminder",
    "Petit rappel",
    "Un recordatorio",
    "Kurze Erinnerung",
    "Um lembrete rápido"
  ],
  [
    "Discord formatting is supported. Mentions will not notify members or roles.",
    "La mise en forme Discord est acceptée. Les mentions n’envoient pas de notifications.",
    "Se admite formato de Discord. Las menciones no notifican a miembros ni roles.",
    "Discord-Formatierung wird unterstützt. Erwähnungen benachrichtigen weder Mitglieder noch Rollen.",
    "Aceita formatação do Discord. Menções não notificam membros nem cargos."
  ],
  [
    "The information people should see in this channel.",
    "Les informations à afficher dans ce salon.",
    "La información que debe verse en este canal.",
    "Informationen, die in diesem Kanal sichtbar sein sollen.",
    "As informações que devem aparecer neste canal."
  ],
  [
    "Counts member messages only, from 1 to 100.",
    "Compte uniquement les messages des membres, de 1 à 100.",
    "Cuenta solo mensajes de miembros, de 1 a 100.",
    "Zählt nur Mitgliedsnachrichten, von 1 bis 100.",
    "Conta só mensagens de membros, de 1 a 100."
  ],
  [
    "From 30 to 3,600 seconds after reaching the message threshold. Saving does not post immediately.",
    "30 à 3600 secondes après le seuil de messages. Enregistrer ne publie pas immédiatement.",
    "De 30 a 3600 segundos tras alcanzar el umbral. Guardar no publica de inmediato.",
    "30 bis 3600 Sekunden nach Erreichen des Schwellenwerts. Speichern veröffentlicht nicht sofort.",
    "De 30 a 3600 segundos após atingir o limite. Salvar não publica imediatamente."
  ],
  [
    "Delivery is unconfirmed. Cyro has paused this reminder to avoid duplicates. Check the channel; it will recover if the matching message is found among the latest 100 messages.",
    "Envoi non confirmé. Cyro suspend ce rappel pour éviter les doublons. Vérifiez le salon ; il reprendra si le message correspondant est retrouvé parmi les 100 derniers.",
    "Envío sin confirmar. Cyro ha pausado el recordatorio para evitar duplicados. Revisa el canal; se recuperará si encuentra el mensaje entre los últimos 100.",
    "Zustellung unbestätigt. Cyro pausiert gegen Duplikate. Prüfe den Kanal; die Erinnerung wird wiederhergestellt, wenn die passende Nachricht unter den letzten 100 gefunden wird.",
    "Envio não confirmado. O Cyro pausou o lembrete para evitar duplicatas. Confira o canal; ele recupera se encontrar a mensagem entre as últimas 100."
  ],
  [
    "The new reminder was posted. Removing the previous tracked reminder is still pending.",
    "Le nouveau rappel est publié. La suppression de l’ancien attend encore.",
    "Nuevo recordatorio publicado. El anterior sigue pendiente de borrarse.",
    "Neue Erinnerung veröffentlicht. Das Entfernen der bisherigen steht noch aus.",
    "Novo lembrete publicado. A remoção do anterior ainda está pendente."
  ],
  [
    "Last posted {p0}.",
    "Dernière publication : {p0}.",
    "Última publicación: {p0}.",
    "Zuletzt veröffentlicht: {p0}.",
    "Última publicação: {p0}."
  ],
  [
    "Category {p0}",
    "Catégorie {p0}",
    "Categoría {p0}",
    "Kategorie {p0}",
    "Categoria {p0}"
  ],
  [
    "Reminder {p0}",
    "Rappel {p0}",
    "Recordatorio {p0}",
    "Erinnerung {p0}",
    "Lembrete {p0}"
  ],
  [
    "Members use /bugreport, pick a category, and fill in a short report. Their Discord name is included.",
    "Les membres utilisent /bugreport, choisissent une catégorie et rédigent un court rapport avec leur nom Discord.",
    "Los miembros usan /bugreport, eligen categoría y rellenan un informe breve con su nombre de Discord.",
    "Mitglieder nutzen /bugreport, wählen eine Kategorie und schreiben eine kurze Meldung mit Discord-Namen.",
    "Os membros usam /bugreport, escolhem a categoria e preenchem um relato breve com seu nome do Discord."
  ],
  [
    "Per member. Use 0 for no cooldown, up to 1,440 minutes.",
    "Par membre. 0 désactive le délai ; maximum 1440 minutes.",
    "Por miembro. 0 sin espera; máximo 1440 minutos.",
    "Pro Mitglied. 0 ohne Wartezeit; höchstens 1440 Minuten.",
    "Por membro. 0 sem intervalo; até 1440 minutos."
  ],
  [
    "Add at least one category when reports are enabled, and choose a channel for each category.",
    "Ajoutez au moins une catégorie si les rapports sont activés, et choisissez un salon pour chacune.",
    "Añade al menos una categoría si los informes están activos y elige un canal para cada una.",
    "Bei aktivierten Meldungen mindestens eine Kategorie hinzufügen und für jede einen Kanal wählen.",
    "Adicione pelo menos uma categoria se os relatos estiverem ativos e escolha um canal para cada uma."
  ],
  [
    "Choose a channel for every sticky message.",
    "Choisissez un salon pour chaque message persistant.",
    "Elige un canal para cada mensaje persistente.",
    "Wähle für jede wiederkehrende Nachricht einen Kanal.",
    "Escolha um canal para cada mensagem persistente."
  ],
  [
    "Use /bugreport in Discord and pick a category. The form asks for a title, what happened, and optional steps to reproduce it.",
    "Utilisez /bugreport dans Discord et choisissez une catégorie. Le formulaire demande un titre, les faits et, si utile, les étapes de reproduction.",
    "Usa /bugreport y elige una categoría. El formulario pide título, qué pasó y pasos opcionales para reproducirlo.",
    "Nutze /bugreport in Discord und wähle eine Kategorie. Das Formular fragt nach Titel, Ereignis und optionalen Schritten zum Nachstellen.",
    "Use /bugreport no Discord e escolha uma categoria. O formulário pede título, o que aconteceu e etapas opcionais para reproduzir."
  ],
  [
    "Reports include the author’s Discord name; they are not anonymous.",
    "Les rapports incluent le nom Discord de l’auteur ; ils ne sont pas anonymes.",
    "Los informes incluyen el nombre de Discord; no son anónimos.",
    "Meldungen enthalten den Discord-Namen; sie sind nicht anonym.",
    "Os relatos incluem o nome do Discord do autor; não são anônimos."
  ],
  [
    "Ask members to leave out passwords, tokens, and personal information.",
    "Demandez de ne pas inclure de mots de passe, jetons ni données personnelles.",
    "Pide que no incluyan contraseñas, tokens ni datos personales.",
    "Bitte Mitglieder, keine Passwörter, Tokens oder persönlichen Daten anzugeben.",
    "Peça para não incluir senhas, tokens ou dados pessoais."
  ],
  [
    "Dashboard staff can move a report between Open, In progress, Resolved, and Dismissed.",
    "L’équipe peut passer un rapport entre Ouvert, En cours, Résolu et Rejeté.",
    "El equipo puede cambiar un informe entre Abierto, En curso, Resuelto y Descartado.",
    "Das Team kann Meldungen auf Offen, In Bearbeitung, Gelöst oder Verworfen setzen.",
    "A equipe pode mudar relatos entre Aberto, Em andamento, Resolvido e Descartado."
  ],
  [
    "A private reports channel lets members send reports without reading other people’s reports. A public channel lets the community follow progress. Set its permissions in Discord.",
    "Un salon privé permet de signaler sans lire les rapports des autres. Un salon public permet à la communauté de suivre l’avancement. Réglez les permissions dans Discord.",
    "Un canal privado permite informar sin leer otros informes. Uno público permite seguir el progreso. Ajusta sus permisos en Discord.",
    "Ein privater Kanal erlaubt Meldungen ohne Einblick in andere Meldungen. Ein öffentlicher Kanal zeigt den Fortschritt. Lege Berechtigungen in Discord fest.",
    "Um canal privado permite relatar sem ler relatos alheios. Um público permite acompanhar o progresso. Ajuste as permissões no Discord."
  ],
  [
    "After enough new member messages arrive, Cyro waits for your chosen delay, posts the reminder, and removes its previous reminder.",
    "Après assez de nouveaux messages, Cyro attend le délai choisi, publie le rappel et supprime son rappel précédent.",
    "Tras suficientes mensajes nuevos, Cyro espera el plazo, publica el recordatorio y elimina el anterior.",
    "Nach genügend neuen Nachrichten wartet Cyro die gewählte Zeit, veröffentlicht die Erinnerung und entfernt die vorherige.",
    "Após mensagens novas suficientes, o Cyro espera o intervalo escolhido, publica o lembrete e remove o anterior."
  ],
  [
    "Bot and webhook messages never count toward the threshold.",
    "Les messages de bots et webhooks ne comptent jamais dans le seuil.",
    "Mensajes de bots y webhooks no cuentan para el umbral.",
    "Bot- und Webhook-Nachrichten zählen nie zum Schwellenwert.",
    "Mensagens de bots e webhooks nunca contam para o limite."
  ],
  [
    "Only Cyro’s exact tracked reminder is removed.",
    "Seul le rappel exact suivi par Cyro est supprimé.",
    "Solo se elimina el recordatorio exacto registrado por Cyro.",
    "Nur Cyros exakt erfasste Erinnerung wird entfernt.",
    "Só o lembrete exato rastreado pelo Cyro é removido."
  ],
  [
    "Disable or remove a reminder and save to remove its tracked post.",
    "Désactivez ou retirez un rappel puis enregistrez pour supprimer sa publication.",
    "Desactiva o quita un recordatorio y guarda para borrar su publicación.",
    "Deaktiviere oder entferne eine Erinnerung und speichere, um ihren Beitrag zu löschen.",
    "Desative ou remova um lembrete e salve para excluir sua publicação."
  ],
  [
    "Give the conversation room",
    "Laissez de la place à la conversation",
    "Dale espacio a la conversación",
    "Gib Gesprächen Raum",
    "Dê espaço à conversa"
  ],
  [
    "Start with 5 messages and a 30-second delay. Use a longer delay or a higher message threshold in busy channels.",
    "Commencez avec 5 messages et 30 secondes. Augmentez le délai ou le seuil dans les salons actifs.",
    "Empieza con 5 mensajes y 30 segundos. Aumenta el plazo o umbral en canales activos.",
    "Starte mit 5 Nachrichten und 30 Sekunden. Nutze in aktiven Kanälen längere Wartezeiten oder höhere Schwellenwerte.",
    "Comece com 5 mensagens e 30 segundos. Aumente o intervalo ou o limite em canais movimentados."
  ],
  [
    "Up to 1,000 reports are retained. Completed reports may be replaced when the history is full.",
    "Jusqu’à 1000 rapports conservés. Les rapports terminés peuvent être remplacés si l’historique est plein.",
    "Se guardan hasta 1000 informes. Los completados pueden sustituirse si se llena el historial.",
    "Bis zu 1000 Meldungen werden gespeichert. Abgeschlossene Meldungen können bei vollem Verlauf ersetzt werden.",
    "Até 1000 relatos são mantidos. Os concluídos podem ser substituídos quando o histórico lotar."
  ],
  [
    "All statuses",
    "Tous les statuts",
    "Todos los estados",
    "Alle Status",
    "Todos os status"
  ],
  [
    "Unconfirmed delivery",
    "Envoi non confirmé",
    "Envío sin confirmar",
    "Unbestätigte Zustellung",
    "Envio não confirmado"
  ],
  [
    "The report was saved, but its send was not confirmed. Check the selected channel before asking the member to submit again.",
    "Le rapport est enregistré, mais l’envoi n’est pas confirmé. Vérifiez le salon avant de demander un nouvel envoi.",
    "El informe está guardado, pero el envío no está confirmado. Revisa el canal antes de pedir que lo reenvíen.",
    "Meldung gespeichert, Versand unbestätigt. Prüfe den Kanal, bevor du um eine erneute Einreichung bittest.",
    "Relato salvo, mas envio não confirmado. Confira o canal antes de pedir para reenviar."
  ],
  [
    "Status for report {p0}",
    "Statut du rapport {p0}",
    "Estado del informe {p0}",
    "Status der Meldung {p0}",
    "Status do relato {p0}"
  ],
  [
    "{error} Refresh reports to check the saved status before retrying.",
    "{error} Actualisez les rapports pour vérifier le statut enregistré avant de réessayer.",
    "{error} Actualiza los informes para comprobar el estado guardado antes de reintentar.",
    "{error} Aktualisiere Meldungen vor einem neuen Versuch, um den gespeicherten Status zu prüfen.",
    "{error} Atualize os relatos para conferir o status salvo antes de tentar novamente."
  ],
  [
    "Category permissions: copy its access rules when a ticket opens, then add the opener and Cyro. Later category changes do not sync to the ticket. Private: restrict access to the opener, support staff and Discord administrators. Applies to new tickets only.",
    "Permissions de catégorie : copie des accès à l’ouverture, puis ajout de l’auteur et de Cyro. Les changements ultérieurs ne se synchronisent pas. Privé : accès limité à l’auteur, à l’assistance et aux administrateurs. Nouveaux tickets uniquement.",
    "Permisos de categoría: copia el acceso al abrir y añade al autor y Cyro. Cambios posteriores no se sincronizan. Privado: solo autor, soporte y administradores. Solo afecta a tickets nuevos.",
    "Kategorie-Rechte: Beim Öffnen kopieren, dann Ersteller und Cyro ergänzen. Spätere Änderungen werden nicht synchronisiert. Privat: Zugriff nur für Ersteller, Support und Administratoren. Nur für neue Tickets.",
    "Permissões da categoria: copia o acesso ao abrir e adiciona autor e Cyro. Mudanças posteriores não sincronizam. Privado: só autor, suporte e administradores. Apenas tickets novos."
  ],
  [
    "Every close saves a downloadable transcript automatically. Delete mode removes the channel only after the complete export is confirmed; Cyro needs Manage Threads and Manage Webhooks to check for unsaved content.",
    "Chaque fermeture sauvegarde une transcription téléchargeable. Le mode Suppression ne retire le salon qu’après confirmation de l’export complet. Cyro a besoin de Gérer les fils et Gérer les webhooks pour vérifier le contenu restant.",
    "Cada cierre guarda una transcripción descargable. El modo eliminar solo borra el canal tras confirmar la exportación completa. Cyro necesita Gestionar hilos y Gestionar webhooks para comprobar contenido pendiente.",
    "Jedes Schließen speichert einen herunterladbaren Mitschnitt. Löschen entfernt den Kanal erst nach bestätigtem vollständigem Export. Cyro benötigt Threads verwalten und Webhooks verwalten zur Prüfung ungesicherter Inhalte.",
    "Cada fechamento salva uma transcrição para download. O modo excluir só remove o canal após confirmar a exportação completa. O Cyro precisa de Gerenciar tópicos e Gerenciar webhooks para verificar conteúdo não salvo."
  ],
  [
    "Image challenge: private code, five-minute expiry, three attempts. A reaction alone is a simple opt-in, without a CAPTCHA.",
    "Défi d’image : code privé, expiration de cinq minutes, trois essais. Une simple réaction est une adhésion volontaire sans CAPTCHA.",
    "Reto de imagen: código privado, caduca en cinco minutos, tres intentos. Una reacción es una aceptación sencilla sin CAPTCHA.",
    "Bildprüfung: privater Code, fünf Minuten gültig, drei Versuche. Eine Reaktion ist einfaches Zustimmen ohne CAPTCHA.",
    "Desafio de imagem: código privado, expira em cinco minutos, três tentativas. Reação é uma adesão simples, sem CAPTCHA."
  ],
  [
    "YouTube uploads need the bot owner’s YouTube Data API key. Only new public uploads are announced; current live streams and archived live broadcasts are excluded.",
    "Les vidéos YouTube nécessitent la clé API YouTube Data de l’opérateur. Seules les nouvelles vidéos publiques sont annoncées ; les directs et leurs archives sont exclus.",
    "Los vídeos de YouTube requieren la clave de YouTube Data API del operador. Solo se anuncian vídeos públicos nuevos; se excluyen directos y sus archivos.",
    "YouTube-Uploads brauchen den YouTube-Data-API-Schlüssel des Betreibers. Nur neue öffentliche Videos werden angekündigt; laufende und archivierte Livestreams sind ausgeschlossen.",
    "Vídeos do YouTube precisam da chave YouTube Data API do operador. Só vídeos públicos novos são anunciados; lives atuais e arquivadas são excluídas."
  ],
  [
    "Each creator must connect their own TikTok account and approve access to public videos before upload alerts can run. TikTok LIVE uses a separate, unofficial connection.",
    "Chaque créateur doit connecter TikTok et autoriser l’accès à ses vidéos publiques avant les alertes. TikTok LIVE utilise une connexion distincte non officielle.",
    "Cada creador debe conectar TikTok y autorizar sus vídeos públicos antes de activar avisos. TikTok LIVE usa una conexión aparte no oficial.",
    "Jeder Creator muss TikTok verbinden und öffentliche Videos freigeben. TikTok LIVE nutzt eine getrennte, inoffizielle Verbindung.",
    "Cada criador precisa conectar o TikTok e autorizar vídeos públicos antes dos alertas. TikTok LIVE usa uma conexão separada não oficial."
  ],
  [
    "Uploaded-video alerts support YouTube and authorized TikTok accounts. Live announcements for this platform continue independently.",
    "Les alertes de vidéos prennent en charge YouTube et les comptes TikTok autorisés. Les annonces de direct restent indépendantes.",
    "Los avisos de vídeos admiten YouTube y cuentas TikTok autorizadas. Los avisos de directo siguen independientes.",
    "Videoankündigungen unterstützen YouTube und autorisierte TikTok-Konten. Live-Ankündigungen laufen unabhängig weiter.",
    "Alertas de vídeos aceitam YouTube e contas TikTok autorizadas. Anúncios ao vivo continuam independentes."
  ],
  [
    "Choose a PNG, JPEG or WebP image.",
    "Choisissez une image PNG, JPEG ou WebP.",
    "Elige una imagen PNG, JPEG o WebP.",
    "Wähle ein PNG-, JPEG- oder WebP-Bild.",
    "Escolha uma imagem PNG, JPEG ou WebP."
  ],
  [
    "Choose an image smaller than 2 MB.",
    "Choisissez une image de moins de 2 Mo.",
    "Elige una imagen de menos de 2 MB.",
    "Wähle ein Bild unter 2 MB.",
    "Escolha uma imagem menor que 2 MB."
  ],
  [
    "This image could not be read. Please choose it again.",
    "Lecture de l’image impossible. Choisissez-la à nouveau.",
    "No se pudo leer la imagen. Elígela de nuevo.",
    "Bild konnte nicht gelesen werden. Wähle es erneut.",
    "Não foi possível ler a imagem. Escolha novamente."
  ],
  [
    "The image upload was cancelled.",
    "L’envoi de l’image a été annulé.",
    "Se canceló la carga de la imagen.",
    "Bildupload abgebrochen.",
    "O envio da imagem foi cancelado."
  ],
  [
    "This image took too long to open. Try another file.",
    "L’image prend trop longtemps à s’ouvrir. Essayez un autre fichier.",
    "La imagen tardó demasiado en abrirse. Prueba otro archivo.",
    "Das Öffnen dauert zu lange. Versuche eine andere Datei.",
    "A imagem demorou demais para abrir. Tente outro arquivo."
  ],
  [
    "This image could not be opened. Try another file.",
    "Ouverture de l’image impossible. Essayez un autre fichier.",
    "No se pudo abrir la imagen. Prueba otro archivo.",
    "Bild konnte nicht geöffnet werden. Versuche eine andere Datei.",
    "Não foi possível abrir a imagem. Tente outro arquivo."
  ],
  [
    "Choose an image no larger than 4096 × 4096 pixels.",
    "Choisissez une image de 4096 × 4096 pixels maximum.",
    "Elige una imagen de hasta 4096 × 4096 píxeles.",
    "Wähle ein Bild bis 4096 × 4096 Pixel.",
    "Escolha uma imagem de até 4096 × 4096 pixels."
  ],
  [
    "This image could not be opened. Choose a valid PNG, JPEG or WebP file.",
    "Ouverture impossible. Choisissez un fichier PNG, JPEG ou WebP valide.",
    "No se pudo abrir. Elige un PNG, JPEG o WebP válido.",
    "Öffnen fehlgeschlagen. Wähle eine gültige PNG-, JPEG- oder WebP-Datei.",
    "Não foi possível abrir. Escolha um PNG, JPEG ou WebP válido."
  ],
  [
    "{error} The update could not be confirmed. Reload from Discord to check before trying again.",
    "{error} Mise à jour non confirmée. Rechargez depuis Discord avant de réessayer.",
    "{error} Actualización sin confirmar. Recarga desde Discord antes de reintentar.",
    "{error} Aktualisierung unbestätigt. Lade vor einem neuen Versuch aus Discord neu.",
    "{error} Atualização não confirmada. Recarregue do Discord antes de tentar novamente."
  ],
  [
    "{error}",
    "{error}",
    "{error}",
    "{error}",
    "{error}"
  ],
  [
    "{error} The response could not be confirmed. Refresh votes to check the saved result before trying again.",
    "{error} Réponse non confirmée. Actualisez les votes pour vérifier le résultat avant de réessayer.",
    "{error} Respuesta sin confirmar. Actualiza los votos para comprobar el resultado antes de reintentar.",
    "{error} Antwort unbestätigt. Aktualisiere die Stimmen und prüfe das Ergebnis vor einem neuen Versuch.",
    "{error} Resposta não confirmada. Atualize os votos e confira o resultado antes de tentar novamente."
  ],
  [
    "Sample of a visible member’s custom status. This preview does not change anyone’s roles.",
    "Exemple de statut d’un membre visible. Cet aperçu ne change aucun rôle.",
    "Ejemplo del estado de un miembro visible. No cambia ningún rol.",
    "Beispielstatus eines sichtbaren Mitglieds. Diese Vorschau ändert keine Rollen.",
    "Exemplo de status de um membro visível. Esta prévia não altera cargos."
  ],
  [
    "Sample of a visible member’s custom status. The rule is disabled until you enable it and save.",
    "Exemple de statut d’un membre visible. La règle reste inactive jusqu’à son activation et enregistrement.",
    "Ejemplo del estado de un miembro visible. La regla sigue inactiva hasta activarla y guardar.",
    "Beispielstatus eines sichtbaren Mitglieds. Die Regel bleibt bis zum Aktivieren und Speichern ausgeschaltet.",
    "Exemplo de status de um membro visível. A regra fica desativada até ativar e salvar."
  ],
  [
    "{error} The save could not be confirmed. Reopen this page to check the saved rule.",
    "{error} Enregistrement non confirmé. Rouvrez la page pour vérifier la règle enregistrée.",
    "{error} Guardado sin confirmar. Reabre la página para comprobar la regla guardada.",
    "{error} Speichern unbestätigt. Öffne die Seite erneut und prüfe die gespeicherte Regel.",
    "{error} Salvamento não confirmado. Reabra a página para conferir a regra salva."
  ],
  [
    "{error} Reopen this page to check whether the save completed.",
    "{error} Rouvrez la page pour vérifier si l’enregistrement a abouti.",
    "{error} Reabre la página para comprobar si se guardó.",
    "{error} Öffne die Seite erneut, um zu prüfen, ob gespeichert wurde.",
    "{error} Reabra a página para conferir se foi salvo."
  ],
  [
    "New application form",
    "Nouveau formulaire de candidature",
    "Nuevo formulario de solicitud",
    "Neues Bewerbungsformular",
    "Novo formulário de candidatura"
  ],
  [
    "Support panel",
    "Panneau d’assistance",
    "Panel de soporte",
    "Support-Panel",
    "Painel de suporte"
  ],
  [
    "Application panel",
    "Panneau de candidature",
    "Panel de solicitudes",
    "Bewerbungspanel",
    "Painel de candidaturas"
  ],
  [
    "How can we help?",
    "Comment pouvons-nous aider ?",
    "¿Cómo podemos ayudar?",
    "Wie können wir helfen?",
    "Como podemos ajudar?"
  ],
  [
    "Join the team",
    "Rejoignez l’équipe",
    "Únete al equipo",
    "Tritt dem Team bei",
    "Entre para a equipe"
  ],
  [
    "Choose a topic to open a ticket with our team. Ticket visibility follows this server's settings.",
    "Choisissez un sujet pour ouvrir un ticket. Sa visibilité suit les réglages de ce serveur.",
    "Elige un tema para abrir un ticket. Su visibilidad sigue los ajustes del servidor.",
    "Wähle ein Thema für ein Ticket. Seine Sichtbarkeit richtet sich nach den Servereinstellungen.",
    "Escolha um assunto para abrir um ticket. Sua visibilidade segue as configurações do servidor."
  ],
  [
    "Choose an application to get started. Your answers are posted in this server's review channel.",
    "Choisissez une candidature pour commencer. Vos réponses seront publiées dans le salon de révision de ce serveur.",
    "Elige una solicitud para empezar. Tus respuestas se publican en el canal de revisión del servidor.",
    "Wähle eine Bewerbung. Deine Antworten erscheinen im Prüfungskanal dieses Servers.",
    "Escolha uma candidatura para começar. Suas respostas são publicadas no canal de análise do servidor."
  ],
  [
    "Yes",
    "Oui",
    "Sí",
    "Ja",
    "Sim"
  ],
  [
    "No",
    "Non",
    "No",
    "Nein",
    "Não"
  ],
  [
    "Timeout",
    "Exclusion temporaire",
    "Aislamiento temporal",
    "Timeout",
    "Castigo"
  ],
  [
    "Warning",
    "Avertissement",
    "Advertencia",
    "Verwarnung",
    "Advertência"
  ],
  [
    "A voice control panel is waiting. Check View Channel, Send Messages, Embed Links, and Read Message History in this room. /room commands still work.",
    "Un panneau vocal est en attente. Vérifiez Voir le salon, Envoyer des messages, Intégrer des liens et Voir les anciens messages dans ce salon. Les commandes /room fonctionnent toujours.",
    "Hay un panel de voz pendiente. Revisa Ver canal, Enviar mensajes, Insertar enlaces y Leer el historial de mensajes en esta sala. Los comandos /room siguen funcionando.",
    "Ein Sprachraum-Panel steht aus. Prüfe Kanal ansehen, Nachrichten senden, Links einbetten und Nachrichtenverlauf anzeigen in diesem Raum. /room-Befehle funktionieren weiterhin.",
    "Um painel de voz está pendente. Confira Ver canal, Enviar mensagens, Inserir links e Ler o histórico de mensagens nesta sala. Os comandos /room continuam funcionando."
  ],
  [
    "A member could not enter their room. Check the lobby and category permissions, room capacity, or pending recovery below.",
    "Un membre n’a pas pu entrer dans son salon. Vérifiez les permissions du salon d’entrée et de la catégorie, la capacité des salons ou la récupération en attente ci-dessous.",
    "Un miembro no pudo entrar en su sala. Revisa los permisos de la sala de entrada y la categoría, la capacidad de las salas o la recuperación pendiente abajo.",
    "Ein Mitglied konnte seinen Raum nicht betreten. Prüfe die Berechtigungen von Eingangskanal und Kategorie, die Raumkapazität oder die ausstehende Wiederherstellung unten.",
    "Um membro não conseguiu entrar na sala. Confira as permissões do canal de entrada e da categoria, a capacidade das salas ou a recuperação pendente abaixo."
  ],
  [
    "Some temporary room changes are waiting. Check Cyro’s channel permissions; it will retry safely.",
    "Certaines modifications de salons temporaires sont en attente. Vérifiez les permissions de salon de Cyro ; il réessaiera sans risque de doublon.",
    "Hay cambios de salas temporales pendientes. Revisa los permisos de canal de Cyro; volverá a intentarlo de forma segura.",
    "Einige Änderungen an temporären Räumen stehen aus. Prüfe Cyros Kanalberechtigungen. Er versucht es sicher erneut.",
    "Algumas alterações nas salas temporárias estão pendentes. Confira as permissões de canal do Cyro; ele tentará novamente com segurança."
  ],
  [
    "A room creation has an uncertain result. Cyro has reserved its owner’s slot to avoid creating duplicates. Staff should check the server and Cyro logs before clearing saved recovery data.",
    "Le résultat de la création d’un salon est incertain. Cyro a réservé la place du propriétaire pour éviter les doublons. L’équipe doit vérifier le serveur et les journaux de Cyro avant d’effacer les données de récupération.",
    "El resultado de la creación de una sala es incierto. Cyro ha reservado el espacio de su propietario para evitar duplicados. El equipo debe revisar el servidor y los registros de Cyro antes de borrar los datos de recuperación.",
    "Das Ergebnis einer Raumerstellung ist unklar. Cyro hat den Platz des Besitzers reserviert, um Duplikate zu vermeiden. Das Team sollte Server und Cyro-Protokolle prüfen, bevor es gespeicherte Wiederherstellungsdaten löscht.",
    "O resultado da criação de uma sala é incerto. O Cyro reservou a vaga do dono para evitar duplicatas. A equipe deve conferir o servidor e os registros do Cyro antes de apagar os dados de recuperação."
  ],
  [
    "Cyro room owner control requested by {actor}",
    "Commande du propriétaire du salon Cyro demandée par {actor}",
    "Control del propietario de la sala de Cyro solicitado por {actor}",
    "Cyro-Raumbesitzer-Steuerung angefordert von {actor}",
    "Controle do dono da sala do Cyro solicitado por {actor}"
  ],
  [
    "Cyro temporary room member limit",
    "Limite de membres du salon temporaire Cyro",
    "Límite de miembros de la sala temporal de Cyro",
    "Mitgliederlimit des temporären Cyro-Raums",
    "Limite de membros da sala temporária do Cyro"
  ],
  [
    "Cyro temporary room owner renamed their room",
    "Le propriétaire du salon temporaire Cyro a renommé son salon",
    "El propietario de la sala temporal de Cyro cambió su nombre",
    "Besitzer hat seinen temporären Cyro-Raum umbenannt",
    "O dono da sala temporária do Cyro renomeou a sala"
  ],
  [
    "Cyro temporary voice room is empty",
    "Le salon vocal temporaire Cyro est vide",
    "La sala de voz temporal de Cyro está vacía",
    "Temporärer Cyro-Sprachraum ist leer",
    "A sala de voz temporária do Cyro está vazia"
  ],
  [
    "Cyro recovered join-to-create room",
    "Cyro : salon créé à l’entrée récupéré",
    "Cyro: sala creada al entrar recuperada",
    "Cyro: beim Beitritt erstellten Raum wiederhergestellt",
    "Cyro: sala criada ao entrar recuperada"
  ],
  [
    "Cyro recovered temporary room creation",
    "Cyro : création du salon temporaire récupérée",
    "Cyro: creación de sala temporal recuperada",
    "Cyro: Erstellung des temporären Raums wiederhergestellt",
    "Cyro: criação da sala temporária recuperada"
  ],
  [
    "Cyro join-to-create voice room",
    "Cyro : entrée dans le salon vocal créé",
    "Cyro: entrada a la sala de voz creada",
    "Cyro: Eintritt in erstellten Sprachraum",
    "Cyro: entrada na sala de voz criada"
  ],
  [
    "Cyro temporary voice room name",
    "Nom du salon vocal temporaire Cyro",
    "Nombre de la sala de voz temporal de Cyro",
    "Name des temporären Cyro-Sprachraums",
    "Nome da sala de voz temporária do Cyro"
  ],
  [
    "Cyro temporary voice room requested by its owner",
    "Salon vocal temporaire Cyro demandé par son propriétaire",
    "Sala de voz temporal de Cyro solicitada por su propietario",
    "Temporärer Cyro-Sprachraum vom Besitzer angefordert",
    "Sala de voz temporária do Cyro solicitada pelo dono"
  ],
  [
    "Cyro returning to existing temporary room",
    "Cyro : retour au salon temporaire existant",
    "Cyro: regreso a la sala temporal existente",
    "Cyro: Rückkehr in bestehenden temporären Raum",
    "Cyro: retorno à sala temporária existente"
  ],
  [
    "Cyro temporary room owner controls",
    "Commandes du propriétaire du salon temporaire Cyro",
    "Controles del propietario de la sala temporal de Cyro",
    "Cyro-Steuerung für Besitzer temporärer Räume",
    "Controles do dono da sala temporária do Cyro"
  ],
  [
    "Your existing room is no longer accessible. Ask server staff to check its permissions.",
    "Votre salon existant n’est plus accessible. Demandez à l’équipe du serveur de vérifier ses permissions.",
    "Tu sala existente ya no es accesible. Pide al equipo del servidor que revise sus permisos.",
    "Dein bestehender Raum ist nicht mehr zugänglich. Bitte das Serverteam, seine Berechtigungen zu prüfen.",
    "Sua sala existente não está mais acessível. Peça à equipe do servidor para verificar as permissões."
  ],
  [
    "Voice room controls · {reference}",
    "Commandes du salon vocal · {reference}",
    "Controles de la sala de voz · {reference}",
    "Sprachraum-Steuerung · {reference}",
    "Controles da sala de voz · {reference}"
  ],
  [
    "Use a permanent voice channel as the lobby, not a temporary room.",
    "Utilisez un salon vocal permanent comme salon d’entrée, pas un salon temporaire.",
    "Usa un canal de voz permanente como sala de entrada, no una sala temporal.",
    "Verwende einen dauerhaften Sprachkanal als Eingang, keinen temporären Raum.",
    "Use um canal de voz permanente como entrada, não uma sala temporária."
  ],
  [
    "The temporary room limit has been reached. Wait for an empty room to close.",
    "La limite de salons temporaires est atteinte. Attendez qu’un salon vide se ferme.",
    "Se ha alcanzado el límite de salas temporales. Espera a que se cierre una sala vacía.",
    "Das Limit temporärer Räume ist erreicht. Warte, bis ein leerer Raum geschlossen wird.",
    "O limite de salas temporárias foi atingido. Aguarde uma sala vazia ser fechada."
  ],
  [
    "The saved voice control panel could not be verified. Staff should check this room before changing its saved panel receipt.",
    "Le panneau vocal enregistré n’a pas pu être vérifié. L’équipe doit vérifier ce salon avant de modifier l’enregistrement sauvegardé du panneau.",
    "No se pudo verificar el panel de voz guardado. El equipo debe revisar esta sala antes de cambiar el registro guardado del panel.",
    "Das gespeicherte Sprachraum-Panel konnte nicht verifiziert werden. Das Team sollte diesen Raum prüfen, bevor es den gespeicherten Panel-Beleg ändert.",
    "Não foi possível verificar o painel de voz salvo. A equipe deve conferir esta sala antes de alterar o registro salvo do painel."
  ],
  [
    "The saved temporary room is not a voice channel in this server.",
    "Le salon temporaire enregistré n’est pas un salon vocal de ce serveur.",
    "La sala temporal guardada no es un canal de voz de este servidor.",
    "Der gespeicherte temporäre Raum ist kein Sprachkanal dieses Servers.",
    "A sala temporária salva não é um canal de voz deste servidor."
  ],
  [
    "The room category is full. Ask staff to select another category.",
    "La catégorie des salons est pleine. Demandez à l’équipe d’en choisir une autre.",
    "La categoría de salas está llena. Pide al equipo que elija otra.",
    "Die Raumkategorie ist voll. Bitte das Team, eine andere auszuwählen.",
    "A categoria das salas está cheia. Peça à equipe para selecionar outra."
  ],
  [
    "The member needs access to both the lobby and the destination category.",
    "Le membre doit avoir accès au salon d’entrée et à la catégorie de destination.",
    "El miembro necesita acceso a la sala de entrada y a la categoría de destino.",
    "Das Mitglied benötigt Zugriff auf den Eingangskanal und die Zielkategorie.",
    "O membro precisa ter acesso ao canal de entrada e à categoria de destino."
  ],
  [
    "Status",
    "Statut",
    "Estado",
    "Status",
    "Status"
  ],
  [
    "Please wait 20 seconds before creating another room.",
    "Attendez 20 secondes avant de créer un autre salon.",
    "Espera 20 segundos antes de crear otra sala.",
    "Warte 20 Sekunden, bevor du einen weiteren Raum erstellst.",
    "Aguarde 20 segundos antes de criar outra sala."
  ],
  [
    "Invalid confessions settings.",
    "Paramètres des confessions invalides.",
    "Ajustes de confesiones no válidos.",
    "Ungültige Beichteneinstellungen.",
    "Configurações de confissões inválidas."
  ],
  [
    "Cyro needs View Channel, Send Messages, Embed Links, and Read Message History in temporary voice rooms to show their control panels.",
    "Cyro a besoin de Voir le salon, Envoyer des messages, Intégrer des liens et Voir les anciens messages dans les salons vocaux temporaires pour afficher leurs panneaux de contrôle.",
    "Cyro necesita Ver canal, Enviar mensajes, Insertar enlaces y Leer el historial de mensajes en las salas de voz temporales para mostrar sus paneles de control.",
    "Cyro benötigt Kanal ansehen, Nachrichten senden, Links einbetten und Nachrichtenverlauf anzeigen in temporären Sprachräumen, um deren Steuerungspanels anzuzeigen.",
    "O Cyro precisa de Ver canal, Enviar mensagens, Inserir links e Ler o histórico de mensagens nas salas de voz temporárias para exibir os painéis de controle."
  ],
  [
    "Cyro needs View Channel, Connect, Manage Channels, Manage Permissions, and Move Members in the room category, plus View Channel, Connect, and Move Members in the lobby.",
    "Cyro a besoin de Voir le salon, Se connecter, Gérer les salons, Gérer les permissions et Déplacer les membres dans la catégorie des salons, ainsi que Voir le salon, Se connecter et Déplacer les membres dans le salon d’entrée.",
    "Cyro necesita Ver canal, Conectar, Gestionar canales, Gestionar permisos y Mover miembros en la categoría de salas, además de Ver canal, Conectar y Mover miembros en la sala de entrada.",
    "Cyro benötigt Kanal ansehen, Verbinden, Kanäle verwalten, Berechtigungen verwalten und Mitglieder verschieben in der Raumkategorie sowie Kanal ansehen, Verbinden und Mitglieder verschieben im Eingangskanal.",
    "O Cyro precisa de Ver canal, Conectar, Gerenciar canais, Gerenciar permissões e Mover membros na categoria das salas, além de Ver canal, Conectar e Mover membros no canal de entrada."
  ],
  [
    "Cyro could not verify the voice control panel delivery. It will check the saved receipt before trying again.",
    "Cyro n’a pas pu vérifier l’envoi du panneau vocal. Il vérifiera l’enregistrement sauvegardé avant de réessayer.",
    "Cyro no pudo verificar el envío del panel de voz. Comprobará el registro guardado antes de intentarlo de nuevo.",
    "Cyro konnte die Zustellung des Sprachraum-Panels nicht bestätigen. Vor einem neuen Versuch wird der gespeicherte Beleg geprüft.",
    "O Cyro não conseguiu verificar o envio do painel de voz. Ele verificará o registro salvo antes de tentar novamente."
  ],
  [
    "Cyro cannot authenticate this room change. Ask the bot operator to check its connection.",
    "Cyro ne peut pas authentifier cette modification du salon. Demandez à l’opérateur du bot de vérifier sa connexion.",
    "Cyro no puede autenticar este cambio de sala. Pide al operador del bot que revise su conexión.",
    "Cyro kann diese Raumänderung nicht authentifizieren. Bitte den Bot-Betreiber, die Verbindung zu prüfen.",
    "O Cyro não consegue autenticar esta alteração na sala. Peça ao operador do bot para verificar a conexão."
  ],
  [
    "Choose a normal voice channel in this server for the join-to-create lobby.",
    "Choisissez un salon vocal normal de ce serveur comme salon d’entrée pour créer des salons.",
    "Elige un canal de voz normal de este servidor como sala de entrada para crear salas.",
    "Wähle einen normalen Sprachkanal dieses Servers als Eingang zum Erstellen neuer Räume.",
    "Escolha um canal de voz normal deste servidor como entrada para criar salas."
  ],
  [
    "Choose a confessions channel and a cooldown from 10 to 3,600 seconds.",
    "Choisissez un salon de confessions et un délai de 10 à 3 600 secondes.",
    "Elige un canal de confesiones y un tiempo de espera de 10 a 3600 segundos.",
    "Wähle einen Beichtenkanal und eine Wartezeit von 10 bis 3.600 Sekunden.",
    "Escolha um canal de confissões e um intervalo de 10 a 3.600 segundos."
  ],
  [
    "Choose a category with fewer than 98 permission overwrites.",
    "Choisissez une catégorie avec moins de 98 dérogations de permissions.",
    "Elige una categoría con menos de 98 sobrescrituras de permisos.",
    "Wähle eine Kategorie mit weniger als 98 Berechtigungsüberschreibungen.",
    "Escolha uma categoria com menos de 98 substituições de permissões."
  ],
  [
    "Choose a category in this server for new rooms.",
    "Choisissez une catégorie de ce serveur pour les nouveaux salons.",
    "Elige una categoría de este servidor para las salas nuevas.",
    "Wähle eine Kategorie auf diesem Server für neue Räume.",
    "Escolha uma categoria deste servidor para as novas salas."
  ],
  [
    "Category",
    "Catégorie",
    "Categoría",
    "Kategorie",
    "Categoria"
  ],
  [
    "A voice control panel has unconfirmed delivery. Cyro is checking recent room messages and will not post a duplicate. Staff can still use /room.",
    "L’envoi d’un panneau vocal n’est pas confirmé. Cyro vérifie les messages récents du salon et ne publiera pas de doublon. L’équipe peut toujours utiliser /room.",
    "No se ha confirmado el envío de un panel de voz. Cyro está comprobando los mensajes recientes de la sala y no publicará un duplicado. El equipo puede seguir usando /room.",
    "Die Zustellung eines Sprachraum-Panels ist unbestätigt. Cyro prüft die letzten Raumnachrichten und veröffentlicht kein Duplikat. Das Team kann weiterhin /room verwenden.",
    "O envio de um painel de voz não foi confirmado. O Cyro está verificando as mensagens recentes da sala e não publicará uma duplicata. A equipe ainda pode usar /room."
  ],
  [
    "A previous room operation is still being checked. Cyro will not create a duplicate.",
    "Une opération précédente sur ce salon est encore en cours de vérification. Cyro ne créera pas de doublon.",
    "Todavía se está comprobando una operación anterior en esta sala. Cyro no creará un duplicado.",
    "Ein vorheriger Raumvorgang wird noch geprüft. Cyro erstellt kein Duplikat.",
    "Uma operação anterior nesta sala ainda está sendo verificada. O Cyro não criará uma duplicata."
  ],
  [
    "Cyro custom status role matched",
    "Le statut personnalisé correspond au rôle Cyro",
    "El estado personalizado coincide con el rol de Cyro",
    "Der benutzerdefinierte Status passt zur Cyro-Rolle",
    "O status personalizado corresponde ao cargo do Cyro"
  ],
  [
    "Cyro custom status role no longer matches",
    "Le statut personnalisé ne correspond plus au rôle Cyro",
    "El estado personalizado ya no coincide con el rol de Cyro",
    "Der benutzerdefinierte Status passt nicht mehr zur Cyro-Rolle",
    "O status personalizado não corresponde mais ao cargo do Cyro"
  ],
  [
    "Unknown",
    "Inconnu",
    "Desconocido",
    "Unbekannt",
    "Desconhecido"
  ],
  [
    "Cooldown",
    "Délai",
    "Tiempo de espera",
    "Wartezeit",
    "Intervalo"
  ],
  [
    "keep",
    "conserver",
    "conservar",
    "beibehalten",
    "manter"
  ],
  [
    "delete",
    "supprimer",
    "eliminar",
    "löschen",
    "excluir"
  ],
  [
    "Choose exactly one current server member. Open the room button again.",
    "Choisissez exactement un membre actuel du serveur. Cliquez de nouveau sur le bouton.",
    "Elige exactamente un miembro actual del servidor. Vuelve a abrir el botón de la sala.",
    "Wähle genau ein aktuelles Servermitglied. Öffne die Raumschaltfläche erneut.",
    "Escolha exatamente um membro atual do servidor. Abra o botão da sala novamente."
  ],
  [
    "This member picker belongs to another person or room. Open your own room control.",
    "Ce sélecteur appartient à une autre personne ou à un autre salon. Ouvrez vos propres commandes.",
    "Este selector pertenece a otra persona o sala. Abre tu propio control de sala.",
    "Diese Mitgliederauswahl gehört einer anderen Person oder einem anderen Raum. Öffne deine eigene Raumsteuerung.",
    "Este seletor de membros pertence a outra pessoa ou sala. Abra o controle da sua própria sala."
  ],
  [
    "This form does not belong to the current room panel. Open its button again.",
    "Ce formulaire ne correspond pas au panneau actuel. Cliquez de nouveau sur son bouton.",
    "Este formulario no pertenece al panel actual. Vuelve a abrir su botón.",
    "Dieses Formular gehört nicht zum aktuellen Bedienfeld. Öffne die Schaltfläche erneut.",
    "Este formulário não pertence ao painel atual da sala. Abra o botão novamente."
  ],
  [
    "This room form has expired. Open the current room panel.",
    "Ce formulaire a expiré. Ouvrez le panneau actuel du salon.",
    "Este formulario caducó. Abre el panel actual de la sala.",
    "Dieses Raumformular ist abgelaufen. Öffne das aktuelle Bedienfeld.",
    "Este formulário de sala expirou. Abra o painel atual da sala."
  ],
  [
    "Too many room member pickers are open. Wait a moment and try again.",
    "Trop de sélecteurs de membres sont ouverts. Patientez un instant et réessayez.",
    "Hay demasiados selectores de miembros abiertos. Espera un momento e inténtalo de nuevo.",
    "Zu viele Mitgliederauswahlen sind geöffnet. Warte kurz und versuche es erneut.",
    "Há seletores de membros demais abertos. Espere um momento e tente novamente."
  ],
  [
    "Use the original Cyro control panel inside its voice room.",
    "Utilisez le panneau Cyro original dans son salon vocal.",
    "Usa el panel original de Cyro dentro de su sala de voz.",
    "Verwende das ursprüngliche Cyro-Bedienfeld in seinem Sprachraum.",
    "Use o painel original do Cyro dentro da sala de voz correspondente."
  ],
  [
    "This room control is no longer supported. Use the current room panel.",
    "Cette commande n’est plus prise en charge. Utilisez le panneau actuel du salon.",
    "Este control ya no es compatible. Usa el panel actual de la sala.",
    "Diese Raumsteuerung wird nicht mehr unterstützt. Verwende das aktuelle Bedienfeld.",
    "Este controle de sala não é mais compatível. Use o painel atual da sala."
  ],
  [
    "This room has reached Discord’s channel permission limit. Remove a member exception first.",
    "Ce salon a atteint la limite de permissions Discord. Retirez d’abord une exception de membre.",
    "Esta sala alcanzó el límite de permisos de Discord. Elimina primero una excepción de miembro.",
    "Dieser Raum hat Discords Limit für Kanalberechtigungen erreicht. Entferne zuerst eine Mitgliederausnahme.",
    "Esta sala atingiu o limite de permissões de canal do Discord. Remova primeiro uma exceção de membro."
  ],
  [
    "A room supports up to 50 allowed and 50 blocked members.",
    "Un salon accepte jusqu’à 50 membres autorisés et 50 membres bloqués.",
    "Una sala admite hasta 50 miembros permitidos y 50 bloqueados.",
    "Ein Raum unterstützt bis zu 50 zugelassene und 50 gesperrte Mitglieder.",
    "Uma sala aceita até 50 membros permitidos e 50 bloqueados."
  ],
  [
    "That member must still have access to this room’s category.",
    "Ce membre doit toujours avoir accès à la catégorie du salon.",
    "Ese miembro debe seguir teniendo acceso a la categoría de esta sala.",
    "Dieses Mitglied muss weiterhin Zugriff auf die Kategorie dieses Raums haben.",
    "Esse membro ainda precisa ter acesso à categoria desta sala."
  ],
  [
    "That member is no longer eligible. Choose a current member who has completed server screening.",
    "Ce membre n’est plus admissible. Choisissez un membre actuel ayant terminé la vérification du serveur.",
    "Ese miembro ya no cumple los requisitos. Elige un miembro actual que haya completado la verificación del servidor.",
    "Dieses Mitglied erfüllt die Voraussetzungen nicht mehr. Wähle ein aktuelles Mitglied, das die Mitgliederüberprüfung abgeschlossen hat.",
    "Esse membro não atende mais aos requisitos. Escolha um membro atual que tenha concluído a verificação do servidor."
  ],
  [
    "That member must already have access to this room’s category.",
    "Ce membre doit déjà avoir accès à la catégorie du salon.",
    "Ese miembro debe tener acceso a la categoría de esta sala.",
    "Dieses Mitglied muss bereits Zugriff auf die Kategorie dieses Raums haben.",
    "Esse membro já precisa ter acesso à categoria desta sala."
  ],
  [
    "Choose another current human member who has completed server screening.",
    "Choisissez un autre membre humain ayant terminé la vérification du serveur.",
    "Elige otro miembro humano que haya completado la verificación del servidor.",
    "Wähle ein anderes menschliches Mitglied, das die Mitgliederüberprüfung abgeschlossen hat.",
    "Escolha outro membro humano que tenha concluído a verificação do servidor."
  ],
  [
    "Discord did not confirm the disconnect. Cyro will not retry it automatically. Check the room before opening a new picker.",
    "Discord n’a pas confirmé la déconnexion. Cyro ne réessaiera pas automatiquement. Vérifiez le salon avant de rouvrir le sélecteur.",
    "Discord no confirmó la desconexión. Cyro no la repetirá automáticamente. Revisa la sala antes de abrir otro selector.",
    "Discord hat die Trennung nicht bestätigt. Cyro versucht es nicht automatisch erneut. Prüfe den Raum, bevor du eine neue Auswahl öffnest.",
    "O Discord não confirmou a desconexão. O Cyro não vai tentar novamente de forma automática. Confira a sala antes de abrir um novo seletor."
  ],
  [
    "Discord could not remove that member. Check that they are still in this room and Cyro has Move Members, then open a new picker.",
    "Discord n’a pas pu retirer ce membre. Vérifiez sa présence et la permission Déplacer les membres de Cyro, puis ouvrez un nouveau sélecteur.",
    "Discord no pudo retirar a ese miembro. Comprueba que siga en la sala y que Cyro tenga Mover miembros; luego abre un nuevo selector.",
    "Discord konnte dieses Mitglied nicht entfernen. Prüfe, ob es noch im Raum ist und Cyro „Mitglieder verschieben“ hat. Öffne dann eine neue Auswahl.",
    "O Discord não conseguiu remover esse membro. Confira se ele ainda está na sala e se o Cyro tem Mover membros; depois abra um novo seletor."
  ],
  [
    "Removing server staff requires Manage Channels and your own Move Members permission in this room.",
    "Pour retirer un membre de l’équipe, vous devez avoir Gérer les salons et Déplacer les membres dans ce salon.",
    "Para retirar a alguien del equipo necesitas Gestionar canales y tu propio permiso Mover miembros en esta sala.",
    "Um Teammitglieder zu entfernen, benötigst du „Kanäle verwalten“ und selbst die Berechtigung „Mitglieder verschieben“ in diesem Raum.",
    "Para remover alguém da equipe, você precisa de Gerenciar canais e da sua própria permissão Mover membros nesta sala."
  ],
  [
    "The server owner cannot be removed with room controls.",
    "Les commandes du salon ne peuvent pas retirer le propriétaire du serveur.",
    "Los controles de sala no pueden retirar al propietario del servidor.",
    "Der Serverinhaber kann nicht über die Raumsteuerung entfernt werden.",
    "O dono do servidor não pode ser removido pelos controles da sala."
  ],
  [
    "Choose another current human member in this room. You cannot remove yourself, the room owner, or Cyro.",
    "Choisissez un autre membre humain présent. Vous ne pouvez pas vous retirer, ni retirer le propriétaire ou Cyro.",
    "Elige otro miembro humano presente. No puedes retirarte a ti, al propietario de la sala ni a Cyro.",
    "Wähle ein anderes menschliches Mitglied in diesem Raum. Du kannst weder dich selbst noch den Rauminhaber oder Cyro entfernen.",
    "Escolha outro membro humano que esteja nesta sala. Você não pode remover a si mesmo, o dono da sala ou o Cyro."
  ],
  [
    "Cyro needs Move Members in this room to disconnect someone.",
    "Cyro a besoin de Déplacer les membres dans ce salon pour déconnecter quelqu’un.",
    "Cyro necesita Mover miembros en esta sala para desconectar a alguien.",
    "Cyro benötigt in diesem Raum „Mitglieder verschieben“, um jemanden zu trennen.",
    "O Cyro precisa de Mover membros nesta sala para desconectar alguém."
  ],
  [
    "Cyro needs Manage Channels and Manage Permissions in this room.",
    "Cyro a besoin de Gérer les salons et Gérer les permissions dans ce salon.",
    "Cyro necesita Gestionar canales y Gestionar permisos en esta sala.",
    "Cyro benötigt in diesem Raum „Kanäle verwalten“ und „Berechtigungen verwalten“.",
    "O Cyro precisa de Gerenciar canais e Gerenciar permissões nesta sala."
  ],
  [
    "This control panel could not be verified. Use the current Cyro panel in your room.",
    "Impossible de vérifier ce panneau. Utilisez le panneau Cyro actuel dans votre salon.",
    "No se pudo verificar este panel. Usa el panel actual de Cyro en tu sala.",
    "Dieses Bedienfeld konnte nicht überprüft werden. Verwende das aktuelle Cyro-Feld in deinem Raum.",
    "Não foi possível verificar este painel. Use o painel atual do Cyro na sua sala."
  ],
  [
    "Use this command as a current server member.",
    "Utilisez cette commande en tant que membre actuel du serveur.",
    "Usa este comando como miembro actual del servidor.",
    "Verwende diesen Befehl als aktuelles Servermitglied.",
    "Use este comando como membro atual do servidor."
  ],
  [
    "Choose a valid room action.",
    "Choisissez une action de salon valide.",
    "Elige una acción de sala válida.",
    "Wähle eine gültige Raumaktion.",
    "Escolha uma ação válida para a sala."
  ],
  [
    "This room is no longer tracked.",
    "Ce salon n’est plus suivi.",
    "Esta sala ya no está registrada.",
    "Dieser Raum wird nicht mehr verwaltet.",
    "Esta sala não está mais registrada."
  ],
  [
    "This temporary room is no longer tracked.",
    "Ce salon temporaire n’est plus suivi.",
    "Esta sala temporal ya no está registrada.",
    "Dieser temporäre Raum wird nicht mehr verwaltet.",
    "Esta sala temporária não está mais registrada."
  ],
  [
    "Temporary voice rooms are stopping. Try again shortly.",
    "Les salons temporaires sont en cours d’arrêt. Réessayez dans un instant.",
    "Las salas temporales se están deteniendo. Inténtalo de nuevo en breve.",
    "Temporäre Sprachräume werden beendet. Versuche es gleich erneut.",
    "As salas de voz temporárias estão sendo encerradas. Tente novamente em instantes."
  ],
  [
    "Cyro could not change this room. Check its channel permissions and try again.",
    "Cyro n’a pas pu modifier ce salon. Vérifiez ses permissions et réessayez.",
    "Cyro no pudo modificar esta sala. Revisa sus permisos e inténtalo de nuevo.",
    "Cyro konnte diesen Raum nicht ändern. Prüfe die Kanalberechtigungen und versuche es erneut.",
    "O Cyro não conseguiu alterar esta sala. Confira as permissões do canal e tente novamente."
  ],
  [
    "That member is no longer in this room. No one was disconnected.",
    "Ce membre n’est plus dans ce salon. Personne n’a été déconnecté.",
    "Ese miembro ya no está en esta sala. No se desconectó a nadie.",
    "Dieses Mitglied ist nicht mehr in diesem Raum. Niemand wurde getrennt.",
    "Esse membro não está mais nesta sala. Ninguém foi desconectado."
  ],
  [
    "Choose a server member.",
    "Choisissez un membre du serveur.",
    "Elige un miembro del servidor.",
    "Wähle ein Servermitglied.",
    "Escolha um membro do servidor."
  ],
  [
    "Enter a whole number from 0 to 99. Use 0 for no member limit.",
    "Saisissez un entier de 0 à 99. Utilisez 0 pour aucune limite.",
    "Introduce un entero de 0 a 99. Usa 0 para no establecer límite.",
    "Gib eine ganze Zahl von 0 bis 99 ein. 0 bedeutet kein Mitgliederlimit.",
    "Digite um número inteiro de 0 a 99. Use 0 para deixar sem limite de membros."
  ],
  [
    "Choose a member limit between 0 and 99.",
    "Choisissez une limite de membres entre 0 et 99.",
    "Elige un límite de miembros entre 0 y 99.",
    "Wähle ein Mitgliederlimit zwischen 0 und 99.",
    "Escolha um limite de membros entre 0 e 99."
  ],
  [
    "Wait 5 minutes before renaming this room again.",
    "Attendez 5 minutes avant de renommer ce salon.",
    "Espera 5 minutos antes de volver a renombrar esta sala.",
    "Warte 5 Minuten, bevor du diesen Raum erneut umbenennst.",
    "Espere 5 minutos antes de renomear esta sala novamente."
  ],
  [
    "Choose a room name between 1 and 80 characters.",
    "Choisissez un nom de salon de 1 à 80 caractères.",
    "Elige un nombre de sala de entre 1 y 80 caracteres.",
    "Wähle einen Raumnamen mit 1 bis 80 Zeichen.",
    "Escolha um nome de sala entre 1 e 80 caracteres."
  ],
  [
    "This member picker has expired or was already used. Open the room button again.",
    "Ce sélecteur a expiré ou a déjà servi. Cliquez de nouveau sur le bouton du salon.",
    "Este selector caducó o ya se usó. Vuelve a abrir el botón de la sala.",
    "Diese Mitgliederauswahl ist abgelaufen oder wurde bereits verwendet. Öffne die Raumschaltfläche erneut.",
    "Este seletor de membros expirou ou já foi usado. Abra o botão da sala novamente."
  ],
  [
    "This member picker has expired. Open the room button again.",
    "Ce sélecteur a expiré. Cliquez de nouveau sur le bouton du salon.",
    "Este selector caducó. Vuelve a abrir el botón de la sala.",
    "Diese Mitgliederauswahl ist abgelaufen. Öffne die Raumschaltfläche erneut.",
    "Este seletor de membros expirou. Abra o botão da sala novamente."
  ],
  [
    "This control panel is no longer active. Use the panel in your current temporary room.",
    "Ce panneau n’est plus actif. Utilisez celui de votre salon temporaire actuel.",
    "Este panel ya no está activo. Usa el de tu sala temporal actual.",
    "Dieses Bedienfeld ist nicht mehr aktiv. Verwende das Feld in deinem aktuellen temporären Raum.",
    "Este painel não está mais ativo. Use o painel da sua sala temporária atual."
  ],
  [
    "This room is no longer accessible.",
    "Ce salon n’est plus accessible.",
    "Esta sala ya no está disponible.",
    "Dieser Raum ist nicht mehr zugänglich.",
    "Esta sala não está mais acessível."
  ],
  [
    "Your room access changed. Rejoin your room and try again.",
    "Votre accès a changé. Rejoignez de nouveau votre salon et réessayez.",
    "Tu acceso cambió. Vuelve a entrar en tu sala e inténtalo de nuevo.",
    "Dein Raumzugriff hat sich geändert. Betritt den Raum erneut und versuche es noch einmal.",
    "Seu acesso à sala mudou. Entre novamente e tente outra vez."
  ],
  [
    "Room owner controls are disabled for this server. Ask staff for help.",
    "Les commandes du propriétaire sont désactivées. Demandez de l’aide à l’équipe.",
    "Los controles del propietario están desactivados. Pide ayuda al equipo.",
    "Die Steuerung durch Rauminhaber ist auf diesem Server deaktiviert. Bitte das Team um Hilfe.",
    "Os controles do dono da sala estão desativados neste servidor. Peça ajuda à equipe."
  ],
  [
    "Only this room’s owner or staff with Manage Channels can change it.",
    "Seuls le propriétaire du salon et l’équipe ayant Gérer les salons peuvent le modifier.",
    "Solo el propietario de la sala o el equipo con Gestionar canales pueden modificarla.",
    "Nur der Rauminhaber oder Teammitglieder mit „Kanäle verwalten“ können diesen Raum ändern.",
    "Só o dono da sala ou a equipe com Gerenciar canais podem alterá-la."
  ],
  [
    "Join the room this control panel belongs to before using its buttons.",
    "Rejoignez le salon de ce panneau avant d’utiliser ses boutons.",
    "Entra en la sala de este panel antes de usar sus botones.",
    "Betritt den Raum dieses Bedienfelds, bevor du dessen Schaltflächen verwendest.",
    "Entre na sala deste painel antes de usar os botões."
  ],
  [
    "Join your temporary voice room before using /room.",
    "Rejoignez votre salon vocal temporaire avant d’utiliser /room.",
    "Entra en tu sala de voz temporal antes de usar /room.",
    "Betritt deinen temporären Sprachraum, bevor du /room verwendest.",
    "Entre na sua sala de voz temporária antes de usar /room."
  ],
  [
    "Use room controls inside your Discord server.",
    "Utilisez les commandes de salon dans votre serveur Discord.",
    "Usa los controles de sala dentro de tu servidor de Discord.",
    "Verwende die Raumsteuerung innerhalb deines Discord-Servers.",
    "Use os controles de sala dentro do seu servidor do Discord."
  ],
  [
    "Search for a member to allow",
    "Rechercher un membre à autoriser",
    "Buscar un miembro para permitir",
    "Mitglied zum Zulassen suchen",
    "Buscar membro para permitir"
  ],
  [
    "Search for a member in this room",
    "Rechercher un membre du salon",
    "Buscar un miembro de esta sala",
    "Mitglied in diesem Raum suchen",
    "Buscar membro nesta sala"
  ],
  [
    "Allow a room member",
    "Autoriser un membre",
    "Permitir a un miembro",
    "Raummitglied zulassen",
    "Permitir membro na sala"
  ],
  [
    "Remove a room member",
    "Retirer un membre du salon",
    "Retirar a un miembro de la sala",
    "Raummitglied entfernen",
    "Remover membro da sala"
  ],
  [
    "Member blocked from joining. This does not disconnect someone already in the call, and Discord administrators bypass channel denies.",
    "Membre bloqué à l’entrée. Cela ne déconnecte pas une personne déjà présente et les administrateurs Discord contournent les restrictions du salon.",
    "Miembro bloqueado para nuevas entradas. Esto no desconecta a quien ya está en la llamada; los administradores de Discord omiten las restricciones del canal.",
    "Beitritt für das Mitglied gesperrt. Bereits verbundene Personen werden nicht getrennt. Discord-Administratoren umgehen verweigerte Kanalrechte.",
    "Entrada bloqueada para o membro. Isso não desconecta quem já está na chamada, e administradores do Discord ignoram as restrições do canal."
  ],
  [
    "Member permitted to join while the room is locked. Existing category visibility still applies.",
    "Membre autorisé à rejoindre le salon verrouillé. La visibilité de la catégorie s’applique toujours.",
    "Miembro autorizado a entrar con la sala bloqueada. Sigue aplicándose la visibilidad de la categoría.",
    "Mitglied darf dem gesperrten Raum beitreten. Die bestehenden Sichtbarkeitsrechte der Kategorie gelten weiterhin.",
    "Membro autorizado a entrar enquanto a sala estiver bloqueada. A visibilidade atual da categoria continua valendo."
  ],
  [
    "Room unlocked. Normal join permissions are restored; individually blocked members remain blocked.",
    "Salon déverrouillé. Les permissions d’accès normales sont rétablies ; les membres bloqués individuellement restent bloqués.",
    "Sala desbloqueada. Se restauraron los permisos normales; los miembros bloqueados individualmente siguen bloqueados.",
    "Raum entsperrt. Die normalen Beitrittsrechte sind wiederhergestellt; einzeln gesperrte Mitglieder bleiben gesperrt.",
    "Sala desbloqueada. As permissões normais de entrada foram restauradas; membros bloqueados individualmente continuam bloqueados."
  ],
  [
    "Room locked. Permitted members and Discord administrators can still join; current members stay in the call.",
    "Salon verrouillé. Les membres autorisés et les administrateurs Discord peuvent entrer ; les membres présents restent dans l’appel.",
    "Sala bloqueada. Los miembros permitidos y los administradores de Discord pueden entrar; los miembros presentes siguen en la llamada.",
    "Raum gesperrt. Zugelassene Mitglieder und Discord-Administratoren können weiterhin beitreten; anwesende Mitglieder bleiben im Anruf.",
    "Sala bloqueada. Membros autorizados e administradores do Discord ainda podem entrar; os membros presentes continuam na chamada."
  ],
  [
    "Member disconnected from this room only. They were not kicked or banned from the server and can rejoin if the room permits it.",
    "Membre déconnecté uniquement de ce salon. Il n’est ni expulsé ni banni du serveur et peut revenir si le salon le permet.",
    "Miembro desconectado solo de esta sala. No se le expulsó ni bloqueó del servidor y puede volver si la sala lo permite.",
    "Mitglied nur von diesem Raum getrennt. Es wurde weder vom Server gekickt noch gebannt und kann erneut beitreten, wenn der Raum es zulässt.",
    "Membro desconectado apenas desta sala. Ele não foi expulso nem banido do servidor e pode voltar se a sala permitir."
  ],
  [
    "Room member limit removed.",
    "Limite de membres supprimée.",
    "Límite de miembros eliminado.",
    "Mitgliederlimit des Raums entfernt.",
    "Limite de membros da sala removido."
  ],
  [
    "Room limit set to {count} members.",
    "Limite fixée à {count} membres.",
    "Límite establecido en {count} miembros.",
    "Raumlimit auf {count} Mitglieder gesetzt.",
    "Limite da sala definido para {count} membros."
  ],
  [
    "Room renamed to {name}.",
    "Salon renommé en {name}.",
    "Sala renombrada a {name}.",
    "Raum in {name} umbenannt.",
    "Sala renomeada para {name}."
  ],
  [
    "Room owner: <@{owner}>. {state} · {limit}. Use /room lock, unlock, name, limit, permit, or revoke. Empty rooms close automatically. Administrators can bypass room locks.",
    "Propriétaire : <@{owner}>. {state} · {limit}. Utilisez /room lock, unlock, name, limit, permit ou revoke. Les salons vides se ferment automatiquement. Les administrateurs peuvent contourner le verrouillage.",
    "Propietario: <@{owner}>. {state} · {limit}. Usa /room lock, unlock, name, limit, permit o revoke. Las salas vacías se cierran automáticamente. Los administradores pueden omitir el bloqueo.",
    "Rauminhaber: <@{owner}>. {state} · {limit}. Verwende /room lock, unlock, name, limit, permit oder revoke. Leere Räume schließen automatisch. Administratoren können Raumsperren umgehen.",
    "Dono da sala: <@{owner}>. {state} · {limit}. Use /room lock, unlock, name, limit, permit ou revoke. Salas vazias fecham automaticamente. Administradores podem ignorar o bloqueio da sala."
  ],
  [
    "{count} members",
    "{count} membres",
    "{count} miembros",
    "{count} Mitglieder",
    "{count} membros"
  ],
  [
    "No member limit",
    "Aucune limite de membres",
    "Sin límite de miembros",
    "Kein Mitgliederlimit",
    "Sem limite de membros"
  ],
  [
    "Open",
    "Ouvert",
    "Abierta",
    "Offen",
    "Aberta"
  ],
  [
    "Locked",
    "Verrouillé",
    "Bloqueada",
    "Gesperrt",
    "Bloqueada"
  ],
  [
    "Room updated",
    "Salon mis à jour",
    "Sala actualizada",
    "Raum aktualisiert",
    "Sala atualizada"
  ],
  [
    "Your temporary room",
    "Votre salon temporaire",
    "Tu sala temporal",
    "Dein temporärer Raum",
    "Sua sala temporária"
  ],
  [
    "Set the member limit",
    "Définir la limite de membres",
    "Establecer el límite de miembros",
    "Mitgliederlimit festlegen",
    "Definir limite de membros"
  ],
  [
    "Rename your room",
    "Renommer votre salon",
    "Renombrar tu sala",
    "Deinen Raum umbenennen",
    "Renomear sua sala"
  ],
  [
    "Member limit (0 means no limit)",
    "Limite de membres (0 = illimitée)",
    "Límite de miembros (0 = sin límite)",
    "Mitgliederlimit (0 = unbegrenzt)",
    "Limite de membros (0 = sem limite)"
  ],
  [
    "Room name",
    "Nom du salon",
    "Nombre de la sala",
    "Raumname",
    "Nome da sala"
  ],
  [
    "Allow member",
    "Autoriser un membre",
    "Permitir miembro",
    "Mitglied zulassen",
    "Permitir membro"
  ],
  [
    "Remove member",
    "Retirer un membre",
    "Retirar miembro",
    "Mitglied entfernen",
    "Remover membro"
  ],
  [
    "Member limit",
    "Limite de membres",
    "Límite de miembros",
    "Mitgliederlimit",
    "Limite de membros"
  ],
  [
    "Rename",
    "Renommer",
    "Renombrar",
    "Umbenennen",
    "Renomear"
  ],
  [
    "Unlock",
    "Déverrouiller",
    "Desbloquear",
    "Entsperren",
    "Desbloquear"
  ],
  [
    "Lock",
    "Verrouiller",
    "Bloquear",
    "Sperren",
    "Bloquear"
  ],
  [
    "Your voice room",
    "Votre salon vocal",
    "Tu sala de voz",
    "Dein Sprachraum",
    "Sua sala de voz"
  ],
  [
    "{connection} The creator needs to reconnect.",
    "{connection} Le créateur doit se reconnecter.",
    "{connection} El creador debe volver a conectarse.",
    "{connection} Der Creator muss sich erneut verbinden.",
    "{connection} O criador precisa reconectar."
  ],
  [
    "{connection}",
    "{connection}",
    "{connection}",
    "{connection}",
    "{connection}"
  ],
  [
    "{error} Your draft is still here.",
    "{error} Votre brouillon est conservé.",
    "{error} Tu borrador se conserva.",
    "{error} Dein Entwurf bleibt erhalten.",
    "{error} Seu rascunho foi mantido."
  ],
  [
    "{error} The save could not be confirmed. Reopen this page to check the saved settings.",
    "{error} Enregistrement non confirmé. Rouvrez la page pour vérifier les réglages.",
    "{error} Guardado sin confirmar. Reabre la página para comprobar los ajustes.",
    "{error} Speichern unbestätigt. Öffne die Seite erneut und prüfe die Einstellungen.",
    "{error} Salvamento não confirmado. Reabra a página para conferir as configurações."
  ],
  [
    "Status roles need the Presence Intent enabled for Cyro, followed by a bot restart.",
    "Les rôles de statut nécessitent Presence Intent pour Cyro, puis un redémarrage du bot.",
    "Los roles de estado requieren activar Presence Intent para Cyro y reiniciar el bot.",
    "Statusrollen benötigen für Cyro aktiviertes Presence Intent und einen Bot-Neustart.",
    "Cargos por status precisam do Presence Intent ativado para o Cyro e de um reinício do bot."
  ],
  [
    "Some status role changes are waiting. Check Cyro’s Manage Roles permission, role order, and reward role permissions. Cyro will retry safely.",
    "Des changements de rôle attendent. Vérifiez Gérer les rôles, la hiérarchie et les permissions du rôle de récompense. Cyro réessaiera sans risque.",
    "Hay cambios de rol pendientes. Revisa Gestionar roles, la jerarquía y los permisos del rol de premio. Cyro reintentará con seguridad.",
    "Einige Rollenänderungen warten. Prüfe Rollen verwalten, die Rollenhierarchie und Rechte der Belohnungsrolle. Cyro versucht es sicher erneut.",
    "Há mudanças de cargo pendentes. Confira Gerenciar cargos, a hierarquia e as permissões do cargo de recompensa. O Cyro tentará novamente com segurança."
  ],
  [
    "Your name is omitted from the public post. Cyro does not retain confession text or author IDs in its saved history. Discord receives the original command and its author. Staff can delete posts. Cooldowns reset when Cyro restarts.",
    "Votre nom n’apparaît pas sur la publication. Cyro ne conserve ni le texte des confessions ni les identifiants des auteurs dans son historique. Discord reçoit la commande et son auteur. L’équipe peut supprimer les publications. Les délais sont réinitialisés au redémarrage de Cyro.",
    "Tu nombre no aparece en la publicación. Cyro no guarda el texto ni los identificadores de autor en su historial. Discord recibe el comando y su autor. El equipo puede borrar publicaciones. Las esperas se reinician al reiniciar Cyro.",
    "Dein Name fehlt im öffentlichen Beitrag. Cyro speichert weder Geständnistext noch Autoren-IDs im Verlauf. Discord erhält den Originalbefehl und den Autor. Das Team kann Beiträge löschen. Wartezeiten werden beim Cyro-Neustart zurückgesetzt.",
    "Seu nome não aparece na publicação. O Cyro não guarda o texto nem os IDs dos autores no histórico. O Discord recebe o comando e o autor. A equipe pode excluir publicações. Os intervalos são zerados ao reiniciar o Cyro."
  ]
];
  window.CyroDashboardCatalogs ||= [];
  window.CyroDashboardCatalogs.push(Object.fromEntries(['fr', 'es', 'de', 'pt'].map((locale, index) => [locale, Object.fromEntries(rows.map(row => [row[0], row[index + 1]]))])));
})();
