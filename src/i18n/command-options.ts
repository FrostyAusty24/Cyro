import type { LocalizationMap } from 'discord.js';

/** Fixed command metadata only. Command names, values and user-entered content are never translated. */
export const COMMAND_OPTION_ROWS: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ['1–99, or 0 for no limit', '1–99, ou 0 sans limite', '1–99, o 0 sin límite', '1–99 oder 0 für unbegrenzt', '1–99, ou 0 sem limite'],
  ['After checking Discord, release stalled local state without undoing Discord actions', 'Après vérification dans Discord, débloquer l’état local sans annuler les actions Discord', 'Tras revisar Discord, liberar el estado local sin deshacer las acciones de Discord', 'Nach Prüfung in Discord den lokalen Zustand freigeben, ohne Discord-Aktionen rückgängig zu machen', 'Após conferir no Discord, liberar o estado local sem desfazer ações do Discord'],
  ['Ban a server member', 'Bannir un membre du serveur', 'Banear a un miembro del servidor', 'Ein Servermitglied bannen', 'Banir um membro do servidor'],
  ['Check every configured streamer now', 'Vérifier tous les streamers configurés maintenant', 'Comprobar todos los streamers configurados ahora', 'Alle eingerichteten Streamer jetzt prüfen', 'Verificar todos os streamers configurados agora'],
  ['Choose a configured streamer', 'Choisir un streamer configuré', 'Elige un streamer configurado', 'Einen eingerichteten Streamer auswählen', 'Escolha um streamer configurado'],
  ['Claim this ticket (configured support staff only)', 'Prendre ce ticket en charge (équipe d’assistance configurée)', 'Asignarte este ticket (solo personal de soporte configurado)', 'Dieses Ticket übernehmen (nur eingerichtetes Support-Team)', 'Assumir este ticket (apenas equipe de suporte configurada)'],
  ['Clear an optional setting', 'Effacer un paramètre facultatif', 'Borrar un ajuste opcional', 'Eine optionale Einstellung löschen', 'Limpar uma configuração opcional'],
  ['Close this ticket and save its transcript', 'Fermer ce ticket et enregistrer sa transcription', 'Cerrar este ticket y guardar su transcripción', 'Dieses Ticket schließen und das Protokoll speichern', 'Fechar este ticket e salvar a transcrição'],
  ['Custom message with placeholders such as {streamer}, {title}, and {url}', 'Message personnalisé avec des variables comme {streamer}, {title} et {url}', 'Mensaje personalizado con variables como {streamer}, {title} y {url}', 'Eigene Nachricht mit Platzhaltern wie {streamer}, {title} und {url}', 'Mensagem personalizada com variáveis como {streamer}, {title} e {url}'],
  ['Delete up to 100 recent messages in this channel', 'Supprimer jusqu’à 100 messages récents dans ce salon', 'Eliminar hasta 100 mensajes recientes de este canal', 'Bis zu 100 neue Nachrichten in diesem Kanal löschen', 'Excluir até 100 mensagens recentes deste canal'],
  ['Discord channel where live alerts are posted', 'Salon Discord où publier les annonces de direct', 'Canal de Discord para publicar los avisos de directos', 'Discord-Kanal für Livestream-Ankündigungen', 'Canal do Discord para publicar alertas de transmissões'],
  ['Discord member who receives the live role', 'Membre Discord qui reçoit le rôle de direct', 'Miembro de Discord que recibe el rol de directo', 'Discord-Mitglied, das die Live-Rolle erhält', 'Membro do Discord que recebe o cargo de transmissão'],
  ['Enable or pause monitoring for a streamer', 'Activer ou suspendre le suivi d’un streamer', 'Activar o pausar el seguimiento de un streamer', 'Die Überwachung eines Streamers aktivieren oder pausieren', 'Ativar ou pausar o monitoramento de um streamer'],
  ['Exact operation ID shown by support-recovery list or the dashboard', 'Identifiant exact affiché par support-recovery list ou le tableau de bord', 'ID exacto mostrado por support-recovery list o el panel', 'Genaue Vorgangs-ID aus support-recovery list oder dem Dashboard', 'ID exato da operação em support-recovery list ou no painel'],
  ['Give your room a new name.', 'Donner un nouveau nom à votre salon.', 'Ponle un nuevo nombre a tu sala.', 'Deinem Raum einen neuen Namen geben.', 'Dê um novo nome à sua sala.'],
  ['Kick a server member', 'Expulser un membre du serveur', 'Expulsar a un miembro del servidor', 'Ein Servermitglied entfernen', 'Expulsar um membro do servidor'],
  ['Let a server member join your locked room.', 'Autoriser un membre à rejoindre votre salon verrouillé.', 'Permite que un miembro entre en tu sala bloqueada.', 'Einem Servermitglied den Zutritt zu deinem gesperrten Raum erlauben.', 'Permita que um membro entre na sua sala trancada.'],
  ['Link this account to an existing creator profile', 'Lier ce compte à un profil de créateur existant', 'Vincular esta cuenta a un perfil de creador existente', 'Dieses Konto mit einem vorhandenen Creator-Profil verknüpfen', 'Vincular esta conta a um perfil de criador existente'],
  ['Member to allow', 'Membre à autoriser', 'Miembro al que permitir acceso', 'Mitglied, dem Zutritt erlaubt wird', 'Membro a permitir'],
  ['Member to block from joining', 'Membre à empêcher d’entrer', 'Miembro al que impedir la entrada', 'Mitglied, dem Zutritt verweigert wird', 'Membro a impedir de entrar'],
  ['Member to moderate', 'Membre à modérer', 'Miembro al que moderar', 'Zu moderierendes Mitglied', 'Membro a moderar'],
  ['Minimum time between alerts for this streamer', 'Délai minimum entre les annonces de ce streamer', 'Tiempo mínimo entre avisos de este streamer', 'Mindestabstand zwischen Ankündigungen für diesen Streamer', 'Intervalo mínimo entre alertas deste streamer'],
  ['Number of messages (messages over 14 days old are skipped)', 'Nombre de messages (ceux de plus de 14 jours sont ignorés)', 'Número de mensajes (se omiten los de más de 14 días)', 'Nachrichtenanzahl (Nachrichten älter als 14 Tage werden übersprungen)', 'Quantidade de mensagens (as com mais de 14 dias são ignoradas)'],
  ['Only alert if the title contains this text', 'Annoncer uniquement si le titre contient ce texte', 'Avisar solo si el título contiene este texto', 'Nur ankündigen, wenn der Titel diesen Text enthält', 'Alertar apenas se o título contiver este texto'],
  ['Open a support ticket', 'Ouvrir un ticket d’assistance', 'Abrir un ticket de soporte', 'Ein Support-Ticket öffnen', 'Abrir um ticket de suporte'],
  ['Optional configured streamer; omit to check this entire platform', 'Streamer configuré facultatif ; laisser vide pour vérifier toute la plateforme', 'Streamer configurado opcional; omítelo para comprobar toda la plataforma', 'Optionaler eingerichteter Streamer; leer lassen, um die gesamte Plattform zu prüfen', 'Streamer configurado opcional; deixe vazio para verificar toda a plataforma'],
  ['Post a test alert without pinging the role', 'Publier une annonce de test sans mentionner le rôle', 'Publicar un aviso de prueba sin mencionar al rol', 'Eine Testankündigung ohne Rollen-Erwähnung senden', 'Publicar um alerta de teste sem mencionar o cargo'],
  ['Post a ticket or saved support panel (Manage Server required)', 'Publier un panneau de tickets ou d’assistance enregistré (Gérer le serveur requis)', 'Publicar un panel de tickets o soporte guardado (requiere Gestionar servidor)', 'Ein Ticket- oder gespeichertes Support-Panel veröffentlichen (Server verwalten nötig)', 'Publicar um painel de tickets ou suporte salvo (requer Gerenciar Servidor)'],
  ['Public YouTube video or direct audio/radio URL; Spotify full-track playback is unavailable', 'Vidéo YouTube publique ou URL audio/radio directe ; lecture complète Spotify indisponible', 'Video público de YouTube o URL de audio/radio; no se reproducen canciones completas de Spotify', 'Öffentliches YouTube-Video oder Audio-/Radio-URL; keine vollständigen Spotify-Titel', 'Vídeo público do YouTube ou URL de áudio/rádio; músicas completas do Spotify indisponíveis'],
  ['Rank creators by', 'Classer les créateurs selon', 'Clasificar creadores por', 'Creator sortieren nach', 'Classificar criadores por'],
  ['Reason recorded in the moderation log', 'Motif enregistré dans le journal de modération', 'Motivo registrado en el historial de moderación', 'Im Moderationsprotokoll gespeicherter Grund', 'Motivo salvo no registro de moderação'],
  ['Reporting period', 'Période du rapport', 'Período del informe', 'Berichtszeitraum', 'Período do relatório'],
  ['Restore the room’s normal join permissions.', 'Rétablir les permissions d’accès normales du salon.', 'Restablece los permisos normales de entrada de la sala.', 'Die normalen Zutrittsberechtigungen des Raums wiederherstellen.', 'Restaure as permissões normais de entrada da sala.'],
  ['Role added to the linked member while live', 'Rôle attribué au membre lié pendant le direct', 'Rol asignado al miembro vinculado durante el directo', 'Rolle für das verknüpfte Mitglied während des Livestreams', 'Cargo atribuído ao membro vinculado durante a transmissão'],
  ['Role mentioned in the alert', 'Rôle mentionné dans l’annonce', 'Rol mencionado en el aviso', 'In der Ankündigung erwähnte Rolle', 'Cargo mencionado no alerta'],
  ['Room name', 'Nom du salon', 'Nombre de la sala', 'Raumname', 'Nome da sala'],
  ['Run a live-status check now', 'Vérifier l’état du direct maintenant', 'Comprobar ahora el estado del directo', 'Den Livestream-Status jetzt prüfen', 'Verificar o status da transmissão agora'],
  ['Saved application form ID; leave blank to choose a form', 'Identifiant du formulaire enregistré ; laisser vide pour choisir', 'ID del formulario guardado; déjalo vacío para elegir uno', 'ID des gespeicherten Bewerbungsformulars; zur Auswahl leer lassen', 'ID do formulário de inscrição salvo; deixe vazio para escolher'],
  ['Saved panel ID from the dashboard; leave blank for ticket categories', 'Identifiant du panneau enregistré ; laisser vide pour les catégories de tickets', 'ID del panel guardado; déjalo vacío para ver las categorías de tickets', 'ID des gespeicherten Panels; für Ticket-Kategorien leer lassen', 'ID do painel salvo; deixe vazio para ver as categorias de tickets'],
  ['Saved ticket type ID; leave blank to choose a category', 'Identifiant du type de ticket enregistré ; laisser vide pour choisir une catégorie', 'ID del tipo de ticket guardado; déjalo vacío para elegir una categoría', 'ID des gespeicherten Ticket-Typs; zur Kategorieauswahl leer lassen', 'ID do tipo de ticket salvo; deixe vazio para escolher uma categoria'],
  ['Search by voice name or language', 'Rechercher par nom de voix ou langue', 'Buscar por nombre de voz o idioma', 'Nach Stimmenname oder Sprache suchen', 'Buscar por nome da voz ou idioma'],
  ['See who owns this room and how to manage it.', 'Voir le propriétaire du salon et comment le gérer.', 'Consulta quién es dueño de la sala y cómo gestionarla.', 'Anzeigen, wem dieser Raum gehört und wie du ihn verwaltest.', 'Veja quem é o dono da sala e como gerenciá-la.'],
  ['Set how many people can join your room.', 'Définir combien de personnes peuvent rejoindre le salon.', 'Define cuántas personas pueden entrar en tu sala.', 'Festlegen, wie viele Personen deinem Raum beitreten können.', 'Defina quantas pessoas podem entrar na sua sala.'],
  ['Setting to clear', 'Paramètre à effacer', 'Ajuste que borrar', 'Zu löschende Einstellung', 'Configuração a limpar'],
  ['Show provider and streamer status', 'Afficher l’état des plateformes et des streamers', 'Mostrar el estado de plataformas y streamers', 'Plattform- und Streamer-Status anzeigen', 'Mostrar o status das plataformas e dos streamers'],
  ['Staff: retain a read-only archive instead of deleting the channel', 'Équipe : conserver une archive en lecture seule au lieu de supprimer le salon', 'Personal: guardar un archivo de solo lectura en vez de eliminar el canal', 'Team: Ein schreibgeschütztes Archiv behalten, statt den Kanal zu löschen', 'Equipe: manter um arquivo somente leitura em vez de excluir o canal'],
  ['Statistics window (UTC calendar days)', 'Période des statistiques (jours calendaires UTC)', 'Período de estadísticas (días naturales UTC)', 'Statistikzeitraum (Kalendertage in UTC)', 'Período das estatísticas (dias do calendário UTC)'],
  ['Stop a member joining your room; does not disconnect them.', 'Empêcher un membre d’entrer ; ne le déconnecte pas.', 'Impide que un miembro entre; no lo desconecta.', 'Einem Mitglied den Zutritt verweigern; trennt keine bestehende Verbindung.', 'Impeça um membro de entrar; não o desconecta.'],
  ['Stop new people joining, except permitted members and server administrators.', 'Bloquer les nouvelles arrivées, sauf les membres autorisés et les administrateurs.', 'Impide nuevas entradas, excepto miembros permitidos y administradores.', 'Neue Beitritte sperren, außer für erlaubte Mitglieder und Serveradministratoren.', 'Bloqueie novas entradas, exceto membros permitidos e administradores.'],
  ['The kind of problem you want to report', 'Le type de problème à signaler', 'El tipo de problema que quieres reportar', 'Die Art des Problems, das du melden möchtest', 'O tipo de problema que deseja relatar'],
  ['Timeout a server member', 'Exclure temporairement un membre du serveur', 'Aislar temporalmente a un miembro del servidor', 'Einem Servermitglied eine Auszeit geben', 'Aplicar castigo a um membro do servidor'],
  ['Timeout duration in minutes', 'Durée de l’exclusion en minutes', 'Duración del aislamiento en minutos', 'Dauer der Auszeit in Minuten', 'Duração do castigo em minutos'],
  ['Username or full channel URL', 'Nom d’utilisateur ou URL complète de la chaîne', 'Nombre de usuario o URL completa del canal', 'Benutzername oder vollständige Kanal-URL', 'Nome de usuário ou URL completo do canal'],
  ['Verify interrupted support operations and list unresolved cases', 'Vérifier les opérations d’assistance interrompues et lister les cas non résolus', 'Revisar operaciones de soporte interrumpidas y listar casos pendientes', 'Unterbrochene Support-Vorgänge prüfen und offene Fälle auflisten', 'Verificar operações de suporte interrompidas e listar casos pendentes'],
  ['Warn a server member', 'Avertir un membre du serveur', 'Advertir a un miembro del servidor', 'Ein Servermitglied verwarnen', 'Advertir um membro do servidor'],
  ['What happens to the alert when the stream ends', 'Comportement de l’annonce à la fin du direct', 'Qué ocurre con el aviso cuando termina el directo', 'Was nach dem Livestream mit der Ankündigung geschieht', 'O que acontece com o alerta quando a transmissão termina'],
  ['What you checked in Discord and why this operation can be released', 'Vérifications faites dans Discord et motif de déblocage de cette opération', 'Qué revisaste en Discord y por qué se puede liberar esta operación', 'Was du in Discord geprüft hast und warum dieser Vorgang freigegeben werden kann', 'O que você conferiu no Discord e por que esta operação pode ser liberada'],
  ['Whether alerts are enabled', 'Activer ou désactiver les annonces', 'Si los avisos están activados', 'Ob Ankündigungen aktiviert sind', 'Se os alertas estão ativados'],
  ['Your confession (posted without your name)', 'Votre confession (publiée sans votre nom)', 'Tu confesión (publicada sin tu nombre)', 'Dein Geständnis (wird ohne deinen Namen veröffentlicht)', 'Sua confissão (publicada sem seu nome)'],
  ['Average concurrent viewers', 'Moyenne de spectateurs simultanés', 'Promedio de espectadores simultáneos', 'Durchschnittliche gleichzeitige Zuschauer', 'Média de espectadores simultâneos'],
  ['Custom message (restore default)', 'Message personnalisé (rétablir celui par défaut)', 'Mensaje personalizado (restaurar predeterminado)', 'Eigene Nachricht (Standard wiederherstellen)', 'Mensagem personalizada (restaurar padrão)'],
  ['Delete the alert', 'Supprimer l’annonce', 'Eliminar el aviso', 'Ankündigung löschen', 'Excluir o alerta'],
  ['Discord member', 'Membre Discord', 'Miembro de Discord', 'Discord-Mitglied', 'Membro do Discord'],
  ['Keep the live alert unchanged', 'Garder l’annonce de direct inchangée', 'Mantener el aviso de directo sin cambios', 'Live-Ankündigung unverändert lassen', 'Manter o alerta de transmissão sem alterações'],
  ['Last 30 days', '30 derniers jours', 'Últimos 30 días', 'Letzte 30 Tage', 'Últimos 30 dias'],
  ['Last 7 days', '7 derniers jours', 'Últimos 7 días', 'Letzte 7 Tage', 'Últimos 7 dias'],
  ['Live role', 'Rôle de direct', 'Rol de directo', 'Live-Rolle', 'Cargo de transmissão'],
  ['Net follower growth', 'Croissance nette des abonnés', 'Crecimiento neto de seguidores', 'Netto-Followerwachstum', 'Crescimento líquido de seguidores'],
  ['Ping role', 'Rôle à mentionner', 'Rol que mencionar', 'Zu erwähnende Rolle', 'Cargo a mencionar'],
  ['Retained 90-day history', 'Historique conservé sur 90 jours', 'Historial conservado de 90 días', 'Gespeicherter 90-Tage-Verlauf', 'Histórico mantido de 90 dias'],
  ['Retained history', 'Historique conservé', 'Historial conservado', 'Gespeicherter Verlauf', 'Histórico mantido'],
  ['Set the alert to offline', 'Marquer l’annonce comme hors ligne', 'Marcar el aviso como desconectado', 'Ankündigung auf offline setzen', 'Marcar o alerta como offline'],
  ['Title filter', 'Filtre de titre', 'Filtro de título', 'Titelfilter', 'Filtro de título'],
  ['Tracked time', 'Durée suivie', 'Tiempo registrado', 'Erfasste Zeit', 'Tempo registrado'],
  ...['Kick', 'Tiktok', 'Twitch', 'Youtube'].flatMap(platform => [
    [`Add a ${platform} streamer`, `Ajouter un streamer ${platform}`, `Añadir un streamer de ${platform}`, `Einen ${platform}-Streamer hinzufügen`, `Adicionar um streamer do ${platform}`],
    [`Edit a ${platform} streamer`, `Modifier un streamer ${platform}`, `Editar un streamer de ${platform}`, `Einen ${platform}-Streamer bearbeiten`, `Editar um streamer do ${platform}`],
    [`List configured ${platform} streamers`, `Lister les streamers ${platform} configurés`, `Listar streamers de ${platform} configurados`, `Eingerichtete ${platform}-Streamer auflisten`, `Listar streamers do ${platform} configurados`],
    [`Remove a ${platform} streamer`, `Retirer un streamer ${platform}`, `Quitar un streamer de ${platform}`, `Einen ${platform}-Streamer entfernen`, `Remover um streamer do ${platform}`],
  ] as const),
];

const catalog: Readonly<Record<string, LocalizationMap>> = Object.fromEntries(COMMAND_OPTION_ROWS.map(([en, fr, es, de, pt]) => [en, { fr, 'es-ES': es, 'es-419': es, de, 'pt-BR': pt }]));

export function commandOptionLocalizations(source: string): LocalizationMap | undefined {
  return Object.hasOwn(catalog, source) ? { ...catalog[source] } : undefined;
}

interface LocalizableOption {
  description: string;
  description_localizations?: LocalizationMap | null;
  options?: LocalizableOption[];
  choices?: Array<{ name: string; name_localizations?: LocalizationMap | null }>;
}

/** Recurse through groups and subcommands without modifying command behavior or the input builders. */
export function localizeCommandOptions<T extends LocalizableOption>(options: readonly T[]): T[] {
  return options.map(option => {
    const copy = { ...option }, descriptions = commandOptionLocalizations(option.description);
    if (descriptions) copy.description_localizations = { ...option.description_localizations, ...descriptions };
    if (option.options) copy.options = localizeCommandOptions(option.options);
    if (option.choices) copy.choices = option.choices.map(choice => {
      const names = commandOptionLocalizations(choice.name);
      return names ? { ...choice, name_localizations: { ...choice.name_localizations, ...names } } : { ...choice };
    });
    return copy;
  });
}
