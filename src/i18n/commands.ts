/** Discord displays these descriptions in the caller's client language. Names stay stable. */
export const COMMAND_DESCRIPTIONS: Readonly<Record<string, readonly [string, string]>> = {
  twitch: ['Gérer les alertes de direct Twitch.', 'Gestionar las alertas de directos de Twitch.'],
  kick: ['Gérer les alertes de direct Kick.', 'Gestionar las alertas de directos de Kick.'],
  youtube: ['Gérer les alertes de direct YouTube.', 'Gestionar las alertas de directos de YouTube.'],
  tiktok: ['Gérer les alertes de direct TikTok.', 'Gestionar las alertas de directos de TikTok.'],
  streamalerts: ['Voir l’état du bot ou vérifier tous les créateurs.', 'Ver el estado del bot o comprobar todos los creadores.'],
  'streamer-leaderboard': ['Voir le classement des directs annoncés dans ce serveur.', 'Ver la clasificación de directos anunciados en este servidor.'],
  dashboard: ['Ouvrir le tableau de bord Cyro pour configurer ce serveur.', 'Abrir el panel de Cyro para configurar este servidor.'],
  help: ['Découvrir les commandes de Cyro et configurer votre serveur.', 'Conocer los comandos de Cyro y configurar tu servidor.'],
  ping: ['Vérifier la connexion de Cyro à Discord.', 'Comprobar la conexión de Cyro con Discord.'],
  counting: ['Voir le compte de la communauté, son record et ses règles.', 'Ver el conteo de la comunidad, su récord y sus reglas.'],
  invites: ['Voir vos invitations uniques et le défi d’invitations.', 'Ver tus invitaciones únicas y el desafío de invitaciones.'],
  rank: ['Voir votre niveau d’activité et votre XP.', 'Ver tu nivel de actividad y tu XP.'],
  leaderboard: ['Voir le classement d’activité du serveur.', 'Ver la clasificación de actividad del servidor.'],
  'roles-panel': ['Publier les boutons des rôles que les membres peuvent choisir.', 'Publicar botones para los roles que los miembros pueden elegir.'],
  moderate: ['Outils de modération avec contrôle des permissions et historique.', 'Herramientas de moderación con control de permisos e historial.'],
  'support-recovery': ['Examiner les opérations d’assistance interrompues sans effacer l’historique Discord.', 'Revisar operaciones de asistencia interrumpidas sin borrar el historial de Discord.'],
  ticket: ['Ouvrir ou gérer un ticket d’assistance.', 'Abrir o gestionar un ticket de asistencia.'],
  apply: ['Choisir et remplir une candidature pour le serveur.', 'Elegir y completar una solicitud para el servidor.'],
  'staff-leaderboard': ['Voir l’activité d’assistance (équipe autorisée uniquement).', 'Ver la actividad de asistencia (solo el equipo autorizado).'],
  playmusic: ['Rejoindre votre appel et ajouter un lien YouTube, audio ou radio à la file.', 'Entrar en tu llamada y añadir un enlace de YouTube, audio o radio a la cola.'],
  musicqueue: ['Afficher la file de musique de cet appel.', 'Mostrar la cola de música de esta llamada.'],
  skipmusic: ['Passer le morceau actuel dans votre appel.', 'Saltar la pista actual de tu llamada.'],
  stopmusic: ['Vider la file de musique et déconnecter Cyro de votre appel.', 'Vaciar la cola de música y desconectar a Cyro de tu llamada.'],
  addtts: ['Rejoindre votre appel et lire les nouveaux messages de son chat.', 'Entrar en tu llamada y leer los nuevos mensajes de su chat.'],
  stoptts: ['Arrêter la synthèse vocale et quitter votre appel.', 'Detener el texto a voz y salir de tu llamada.'],
  ttsvoice: ['Choisir votre voix de synthèse vocale pour ce serveur.', 'Elegir tu voz de texto a voz para este servidor.'],
  ttslanguage: ['Choisir la langue de votre synthèse vocale.', 'Elegir el idioma de tu texto a voz.'],
  room: ['Gérer le salon vocal temporaire dans lequel vous êtes.', 'Gestionar la sala de voz temporal en la que estás.'],
  bugreport: ['Signaler un problème du bot ou du serveur à l’équipe. Votre nom est inclus.', 'Informar de un problema del bot o del servidor al equipo. Se incluye tu nombre.'],
  confess: ['Publier une confession anonyme dans le salon configuré de ce serveur.', 'Publicar una confesión anónima en el canal configurado de este servidor.'],
  suggestion: ['Proposer une idée au vote des membres du serveur.', 'Proponer una idea para que voten los miembros del servidor.'],
  poll: ['Ouvrir le créateur de sondages dans le tableau de bord.', 'Abrir el creador de encuestas en el panel.'],
  embed: ['Ouvrir le rédacteur de messages dans le tableau de bord.', 'Abrir el editor de mensajes en el panel.'],
  time: ['Pointer l’arrivée, le départ et consulter le temps enregistré sur ce serveur.', 'Registrar entradas, salidas y consultar el tiempo registrado en este servidor.'],
};

const GERMAN_PORTUGUESE_DESCRIPTIONS: Readonly<Record<string, readonly [string, string]>> = {
  twitch: ['Twitch-Live-Benachrichtigungen verwalten.', 'Gerenciar alertas de transmissões ao vivo da Twitch.'],
  kick: ['Kick-Live-Benachrichtigungen verwalten.', 'Gerenciar alertas de transmissões ao vivo da Kick.'],
  youtube: ['YouTube-Live-Benachrichtigungen verwalten.', 'Gerenciar alertas de transmissões ao vivo do YouTube.'],
  tiktok: ['TikTok-Live-Benachrichtigungen verwalten.', 'Gerenciar alertas de transmissões ao vivo do TikTok.'],
  streamalerts: ['Den Bot-Status anzeigen oder alle Creator prüfen.', 'Ver o status do bot ou verificar todos os criadores.'],
  'streamer-leaderboard': ['Die Rangliste der auf diesem Server angekündigten Streams anzeigen.', 'Ver a classificação das transmissões anunciadas neste servidor.'],
  dashboard: ['Das Cyro-Dashboard öffnen und diesen Server einrichten.', 'Abrir o painel do Cyro para configurar este servidor.'],
  help: ['Cyros Befehle kennenlernen und deinen Server einrichten.', 'Conhecer os comandos do Cyro e configurar seu servidor.'],
  ping: ['Cyros Verbindung zu Discord prüfen.', 'Verificar a conexão do Cyro com o Discord.'],
  counting: ['Den Zählerstand, Rekord und die Regeln der Community anzeigen.', 'Ver a contagem da comunidade, seu recorde e suas regras.'],
  invites: ['Deine eindeutigen Einladungen und die Einladungs-Challenge anzeigen.', 'Ver seus convites únicos e o desafio de convites.'],
  rank: ['Dein Aktivitätslevel und deine XP anzeigen.', 'Ver seu nível de atividade e seu XP.'],
  leaderboard: ['Die Aktivitätsrangliste des Servers anzeigen.', 'Ver a classificação de atividade do servidor.'],
  'roles-panel': ['Schaltflächen für Rollen veröffentlichen, die Mitglieder selbst auswählen können.', 'Publicar botões dos cargos que os membros podem escolher.'],
  moderate: ['Moderationswerkzeuge mit Berechtigungsprüfung und Protokoll.', 'Ferramentas de moderação com verificação de permissões e histórico.'],
  'support-recovery': ['Unterbrochene Support-Vorgänge prüfen, ohne den Discord-Verlauf zu löschen.', 'Revisar operações de suporte interrompidas sem apagar o histórico do Discord.'],
  ticket: ['Ein Support-Ticket öffnen oder verwalten.', 'Abrir ou gerenciar um ticket de suporte.'],
  apply: ['Eine Bewerbung für den Server auswählen und ausfüllen.', 'Escolher e preencher uma candidatura para o servidor.'],
  'staff-leaderboard': ['Die Support-Aktivität anzeigen (nur für berechtigte Teammitglieder).', 'Ver a atividade de suporte (somente equipe autorizada).'],
  playmusic: ['Deinem Anruf beitreten und einen YouTube-, Audio- oder Radiolink zur Warteschlange hinzufügen.', 'Entrar na sua chamada e adicionar um link do YouTube, de áudio ou de rádio à fila.'],
  musicqueue: ['Die Musikwarteschlange dieses Anrufs anzeigen.', 'Mostrar a fila de músicas desta chamada.'],
  skipmusic: ['Den aktuellen Titel in deinem Anruf überspringen.', 'Pular a música atual da sua chamada.'],
  stopmusic: ['Die Musikwarteschlange leeren und Cyro von deinem Anruf trennen.', 'Limpar a fila de músicas e desconectar o Cyro da sua chamada.'],
  addtts: ['Deinem Anruf beitreten und neue Nachrichten aus seinem Chat vorlesen.', 'Entrar na sua chamada e ler as novas mensagens do chat.'],
  stoptts: ['Die Sprachausgabe stoppen und deinen Anruf verlassen.', 'Parar a leitura de mensagens e sair da sua chamada.'],
  ttsvoice: ['Deine Stimme für die Sprachausgabe auf diesem Server auswählen.', 'Escolher sua voz de leitura de mensagens para este servidor.'],
  ttslanguage: ['Die Sprache deiner Sprachausgabe auswählen.', 'Escolher o idioma da sua leitura de mensagens.'],
  room: ['Den temporären Sprachraum verwalten, in dem du gerade bist.', 'Gerenciar a sala de voz temporária em que você está.'],
  bugreport: ['Dem Team ein Bot- oder Serverproblem melden. Dein Name wird mitgesendet.', 'Relatar um problema do bot ou do servidor à equipe. Seu nome será incluído.'],
  confess: ['Eine anonyme Beichte im dafür eingerichteten Serverkanal veröffentlichen.', 'Publicar uma confissão anônima no canal configurado deste servidor.'],
  suggestion: ['Eine Idee vorschlagen, über die Servermitglieder abstimmen können.', 'Sugerir uma ideia para os membros do servidor votarem.'],
  poll: ['Den Umfrage-Editor im Dashboard öffnen.', 'Abrir o criador de enquetes no painel.'],
  embed: ['Den Nachrichten-Editor im Dashboard öffnen.', 'Abrir o editor de mensagens no painel.'],
  time: ['Ein- und ausstempeln und die erfasste Zeit auf diesem Server prüfen.', 'Registrar entradas, saídas e consultar o tempo registrado neste servidor.'],
};

export function commandDescriptionLocalizations(name: string, description: string) {
  const existing = Object.hasOwn(COMMAND_DESCRIPTIONS, name) ? COMMAND_DESCRIPTIONS[name] : undefined;
  const additional = Object.hasOwn(GERMAN_PORTUGUESE_DESCRIPTIONS, name) ? GERMAN_PORTUGUESE_DESCRIPTIONS[name] : undefined;
  let translations: readonly [string, string, string, string] | undefined = existing && additional ? [...existing, ...additional] : undefined;
  // Preserve existing voice aliases, including their names and voice IDs.
  if (!translations && /^ttsvoice\d+$/.test(name)) {
    const voice = /^Use (.+) as your personal TTS voice\.$/.exec(description)?.[1]?.split(' · ')[0];
    if (voice) translations = [`Utiliser ${voice} comme voix de synthèse vocale.`, `Usar ${voice} como tu voz de texto a voz.`, `Nutze ${voice} als deine TTS-Stimme.`, `Usar ${voice} como sua voz de TTS.`];
  }
  if (!translations || translations.some(value => value.length < 1 || value.length > 100)) return undefined;
  return { fr: translations[0], 'es-ES': translations[1], 'es-419': translations[1], de: translations[2], 'pt-BR': translations[3] };
}
