import { CUSTOM_COMMAND_MESSAGE_ROWS } from './custom-commands.js';
import { BOT_TRANSLATIONS } from './messages.js';
import { BotMessageError, type TextParams } from './index.js';

const CONNECTION_ERROR_ROWS: Row[] = [
['Connect TikTok using the main dashboard address when it is available. Existing connections are still managed here.', 'Connectez TikTok depuis l’adresse principale du tableau de bord lorsqu’elle est disponible. Vous pouvez toujours gérer les connexions existantes ici.', 'Conecta TikTok desde la dirección principal del panel cuando esté disponible. Puedes seguir gestionando las conexiones existentes aquí.', 'Verbinde TikTok über die Hauptadresse des Dashboards, sobald sie verfügbar ist. Bestehende Verbindungen kannst du weiterhin hier verwalten.', 'Conecte o TikTok pelo endereço principal do painel quando estiver disponível. As conexões existentes ainda podem ser gerenciadas aqui.'],
["These settings are not available.","Ces paramètres sont indisponibles.","Estos ajustes no están disponibles.","Diese Einstellungen sind nicht verfügbar.","Estas configurações estão indisponíveis."],
["Use GET or PATCH for these settings.","Utilisez GET ou PATCH pour ces paramètres.","Usa GET o PATCH para estos ajustes.","Verwende GET oder PATCH für diese Einstellungen.","Use GET ou PATCH para estas configurações."],
["Invalid configuration.","Configuration non valide.","Configuración no válida.","Ungültige Konfiguration.","Configuração inválida."],
["Invalid status role configuration.","Configuration des rôles de statut non valide.","Configuración de roles por estado no válida.","Ungültige Statusrollen-Konfiguration.","Configuração de cargos por status inválida."],
["Invalid suggestions configuration.","Configuration des suggestions non valide.","Configuración de sugerencias no válida.","Ungültige Vorschlagskonfiguration.","Configuração de sugestões inválida."],
["Invalid stream configuration.","Configuration de diffusion non valide.","Configuración de transmisión no válida.","Ungültige Stream-Konfiguration.","Configuração de transmissão inválida."],
["Invalid creator configuration.","Configuration de créateur non valide.","Configuración de creador no válida.","Ungültige Creator-Konfiguration.","Configuração de criador inválida."],
["The change could not be saved.","La modification n’a pas pu être enregistrée.","No se pudo guardar el cambio.","Die Änderung konnte nicht gespeichert werden.","Não foi possível salvar a alteração."],
["Could not update this suggestion.","Impossible de mettre à jour cette suggestion.","No se pudo actualizar esta sugerencia.","Dieser Vorschlag konnte nicht aktualisiert werden.","Não foi possível atualizar esta sugestão."],
["Publishing failed.","La publication a échoué.","La publicación falló.","Veröffentlichung fehlgeschlagen.","A publicação falhou."],
["Could not publish this panel.","Impossible de publier ce panneau.","No se pudo publicar este panel.","Dieses Panel konnte nicht veröffentlicht werden.","Não foi possível publicar este painel."],
["A video announcement has an uncertain delivery outcome. Check the channel; Cyro will not automatically resend it.","Le résultat d’envoi d’une annonce vidéo est incertain. Vérifiez le salon ; Cyro ne la renverra pas automatiquement.","No se conoce el resultado del envío de un anuncio de video. Revisa el canal; Cyro no lo reenviará automáticamente.","Das Versandergebnis einer Video-Ankündigung ist ungewiss. Prüfe den Kanal; Cyro sendet sie nicht automatisch erneut.","O resultado do envio de um anúncio de vídeo é incerto. Confira o canal; Cyro não o reenviará automaticamente."],
["The upload channel is missing or is not sendable in this server.","Le salon de vidéos est introuvable ou n’accepte pas d’envoi dans ce serveur.","El canal de videos no existe o no permite enviar mensajes en este servidor.","Der Video-Kanal fehlt oder erlaubt auf diesem Server kein Senden.","O canal de vídeos está ausente ou não permite envios neste servidor."],
["TikTok reported LIVE without a stable room ID. The previous state was preserved until a reliable broadcast can be confirmed.","TikTok a signalé un direct sans identifiant de salle stable. L’état précédent est conservé jusqu’à la confirmation fiable d’une diffusion.","TikTok indicó un directo sin un ID de sala estable. Se conservó el estado anterior hasta confirmar una transmisión fiable.","TikTok meldete LIVE ohne stabile Raum-ID. Der vorherige Zustand bleibt erhalten, bis eine Übertragung zuverlässig bestätigt werden kann.","O TikTok informou LIVE sem um ID de sala estável. O estado anterior foi preservado até que uma transmissão possa ser confirmada com segurança."],
["TikTok LIVE could not be checked. The unofficial connector may be blocked or unavailable; check the host network and optional Euler API key.","Impossible de vérifier TikTok LIVE. Le connecteur non officiel peut être bloqué ou indisponible ; vérifiez le réseau de l’hébergement et la clé API Euler facultative.","No se pudo consultar TikTok LIVE. El conector no oficial puede estar bloqueado o no disponible; revisa la red del alojamiento y la clave API opcional de Euler.","TikTok LIVE konnte nicht geprüft werden. Der inoffizielle Connector ist möglicherweise blockiert oder nicht verfügbar; prüfe das Host-Netzwerk und den optionalen Euler-API-Schlüssel.","Não foi possível verificar o TikTok LIVE. O conector não oficial pode estar bloqueado ou indisponível; confira a rede da hospedagem e a chave de API Euler opcional."],
["We couldn’t complete that request.","Nous n’avons pas pu traiter cette requête.","No pudimos completar esa solicitud.","Diese Anfrage konnte nicht abgeschlossen werden.","Não conseguimos concluir essa solicitação."],
["Back to Cyro","Retour à Cyro","Volver a Cyro","Zurück zu Cyro","Voltar ao Cyro"],
["Try signing in again","Réessayer la connexion","Volver a iniciar sesión","Erneut anmelden","Tentar entrar novamente"],
  [
    "Invalid TikTok login state.",
    "État de connexion TikTok non valide.",
    "Estado de inicio de sesión con TikTok no válido.",
    "Ungültiger TikTok-Anmeldestatus.",
    "Estado de login do TikTok inválido."
  ],
  [
    "TikTok connections are not ready.",
    "Les connexions TikTok ne sont pas prêtes.",
    "Las conexiones con TikTok no están listas.",
    "TikTok-Verbindungen sind noch nicht bereit.",
    "As conexões com o TikTok ainda não estão prontas."
  ],
  [
    "Could not save private TikTok connections. Please try again.",
    "Impossible d’enregistrer les connexions TikTok privées. Réessayez.",
    "No se pudieron guardar las conexiones privadas de TikTok. Inténtalo de nuevo.",
    "Private TikTok-Verbindungen konnten nicht gespeichert werden. Versuche es erneut.",
    "Não foi possível salvar as conexões privadas do TikTok. Tente novamente."
  ],
  [
    "TikTok could not be reached. Please try again later.",
    "TikTok est injoignable. Réessayez plus tard.",
    "No se pudo contactar con TikTok. Inténtalo más tarde.",
    "TikTok war nicht erreichbar. Versuche es später erneut.",
    "Não foi possível acessar o TikTok. Tente novamente mais tarde."
  ],
  [
    "TikTok returned an unreadable response. Please try again later.",
    "TikTok a renvoyé une réponse illisible. Réessayez plus tard.",
    "TikTok devolvió una respuesta ilegible. Inténtalo más tarde.",
    "TikTok hat eine unlesbare Antwort zurückgegeben. Versuche es später erneut.",
    "O TikTok retornou uma resposta ilegível. Tente novamente mais tarde."
  ],
  [
    "TikTok public-video access was not granted. Connect again and allow both requested permissions.",
    "L’accès aux vidéos publiques TikTok n’a pas été accordé. Reconnectez-vous et autorisez les deux permissions demandées.",
    "No se concedió acceso a los videos públicos de TikTok. Conecta de nuevo y acepta ambos permisos solicitados.",
    "Der Zugriff auf öffentliche TikTok-Videos wurde nicht erlaubt. Verbinde dich erneut und erlaube beide angeforderten Berechtigungen.",
    "O acesso aos vídeos públicos do TikTok não foi concedido. Conecte novamente e permita as duas permissões solicitadas."
  ],
  [
    "TikTok returned an invalid token response. Connect again.",
    "TikTok a renvoyé un jeton non valide. Reconnectez-vous.",
    "TikTok devolvió una respuesta de token no válida. Conecta de nuevo.",
    "TikTok hat eine ungültige Token-Antwort zurückgegeben. Verbinde dich erneut.",
    "O TikTok retornou uma resposta de token inválida. Conecte novamente."
  ],
  [
    "Invalid TikTok connection request.",
    "Requête de connexion TikTok non valide.",
    "Solicitud de conexión con TikTok no válida.",
    "Ungültige TikTok-Verbindungsanfrage.",
    "Solicitação de conexão com o TikTok inválida."
  ],
  [
    "The previous creator must disconnect this TikTok connection before it can be replaced.",
    "Le créateur précédent doit déconnecter ce compte TikTok avant son remplacement.",
    "El creador anterior debe desconectar esta conexión con TikTok antes de reemplazarla.",
    "Der vorherige Creator muss diese TikTok-Verbindung trennen, bevor sie ersetzt werden kann.",
    "O criador anterior deve desconectar esta conexão com o TikTok antes de substituí-la."
  ],
  [
    "TikTok connection capacity has been reached.",
    "La capacité de connexions TikTok est atteinte.",
    "Se alcanzó el límite de conexiones con TikTok.",
    "Die Kapazität für TikTok-Verbindungen ist erreicht.",
    "A capacidade de conexões com o TikTok foi atingida."
  ],
  [
    "TikTok did not confirm the connected account identity.",
    "TikTok n’a pas confirmé l’identité du compte connecté.",
    "TikTok no confirmó la identidad de la cuenta conectada.",
    "TikTok hat die Identität des verbundenen Kontos nicht bestätigt.",
    "O TikTok não confirmou a identidade da conta conectada."
  ],
  [
    "This TikTok account is already connected to another Discord user. Disconnect it from that account first.",
    "Ce compte TikTok est déjà connecté à un autre utilisateur Discord. Déconnectez-le d’abord de cet utilisateur.",
    "Esta cuenta de TikTok ya está conectada a otro usuario de Discord. Desconéctala primero de esa cuenta.",
    "Dieses TikTok-Konto ist bereits mit einem anderen Discord-Nutzer verbunden. Trenne es zuerst von diesem Konto.",
    "Esta conta do TikTok já está conectada a outro usuário do Discord. Desconecte-a dessa conta primeiro."
  ],
  [
    "TikTok account capacity has been reached.",
    "La capacité de comptes TikTok est atteinte.",
    "Se alcanzó el límite de cuentas de TikTok.",
    "Die Kapazität für TikTok-Konten ist erreicht.",
    "A capacidade de contas do TikTok foi atingida."
  ],
  [
    "TikTok returned an invalid public-video list.",
    "TikTok a renvoyé une liste de vidéos publiques non valide.",
    "TikTok devolvió una lista de videos públicos no válida.",
    "TikTok hat eine ungültige Liste öffentlicher Videos zurückgegeben.",
    "O TikTok retornou uma lista de vídeos públicos inválida."
  ],
  [
    "TikTok connection not found for this Discord user.",
    "Connexion TikTok introuvable pour cet utilisateur Discord.",
    "Conexión con TikTok no encontrada para este usuario de Discord.",
    "Keine TikTok-Verbindung für diesen Discord-Nutzer gefunden.",
    "Conexão com o TikTok não encontrada para este usuário do Discord."
  ],
  [
    "TikTok connection was cancelled.",
    "La connexion TikTok a été annulée.",
    "Se canceló la conexión con TikTok.",
    "Die TikTok-Verbindung wurde abgebrochen.",
    "A conexão com o TikTok foi cancelada."
  ],
  [
    "The linked Discord member must connect their TikTok account to allow public-video alerts.",
    "Le membre Discord associé doit connecter son compte TikTok pour autoriser les alertes de vidéos publiques.",
    "El miembro de Discord vinculado debe conectar su cuenta de TikTok para permitir avisos de videos públicos.",
    "Das verknüpfte Discord-Mitglied muss sein TikTok-Konto verbinden, um öffentliche Video-Benachrichtigungen zu erlauben.",
    "O membro do Discord vinculado deve conectar sua conta do TikTok para permitir alertas de vídeos públicos."
  ],
  [
    "The creator needs to connect TikTok again and allow basic profile and public-video access.",
    "Le créateur doit reconnecter TikTok et autoriser l’accès au profil de base et aux vidéos publiques.",
    "El creador debe volver a conectar TikTok y permitir el acceso al perfil básico y a los videos públicos.",
    "Der Creator muss TikTok erneut verbinden und den Zugriff auf das Basisprofil und öffentliche Videos erlauben.",
    "O criador precisa conectar o TikTok novamente e permitir acesso ao perfil básico e aos vídeos públicos."
  ],
  [
    "Public TikTok videos are checked about every five minutes. This connection does not verify the manually entered LIVE handle.",
    "Les vidéos publiques TikTok sont vérifiées environ toutes les cinq minutes. Cette connexion ne vérifie pas le pseudo LIVE saisi manuellement.",
    "Los videos públicos de TikTok se consultan cada cinco minutos aproximadamente. Esta conexión no verifica el usuario de LIVE introducido manualmente.",
    "Öffentliche TikTok-Videos werden etwa alle fünf Minuten geprüft. Diese Verbindung verifiziert den manuell eingegebenen LIVE-Namen nicht.",
    "Os vídeos públicos do TikTok são verificados a cada cinco minutos aproximadamente. Esta conexão não verifica o nome de LIVE inserido manualmente."
  ],
  [
    "TikTok public-video alerts require Login Kit, video.list, and a connection from the linked Discord member.",
    "Les alertes de vidéos publiques TikTok nécessitent Login Kit, video.list et la connexion du membre Discord associé.",
    "Los avisos de videos públicos de TikTok requieren Login Kit, video.list y una conexión del miembro de Discord vinculado.",
    "Öffentliche TikTok-Video-Benachrichtigungen benötigen Login Kit, video.list und eine Verbindung des verknüpften Discord-Mitglieds.",
    "Os alertas de vídeos públicos do TikTok exigem Login Kit, video.list e uma conexão do membro do Discord vinculado."
  ],
  [
    "The linked Discord member changed. The previous creator must disconnect before the new member connects TikTok.",
    "Le membre Discord associé a changé. Le créateur précédent doit se déconnecter avant la connexion TikTok du nouveau membre.",
    "El miembro de Discord vinculado cambió. El creador anterior debe desconectarse antes de que el nuevo miembro conecte TikTok.",
    "Das verknüpfte Discord-Mitglied hat sich geändert. Der vorherige Creator muss die Verbindung trennen, bevor das neue Mitglied TikTok verbindet.",
    "O membro do Discord vinculado mudou. O criador anterior deve desconectar antes que o novo membro conecte o TikTok."
  ],
  [
    "The previous creator must disconnect this profile before you can connect TikTok. Contact Cyro support if they cannot access it.",
    "Le créateur précédent doit déconnecter ce profil avant que vous puissiez connecter TikTok. Contactez l’assistance Cyro s’il n’y a plus accès.",
    "El creador anterior debe desconectar este perfil antes de que puedas conectar TikTok. Contacta con soporte de Cyro si no puede acceder.",
    "Der vorherige Creator muss dieses Profil trennen, bevor du TikTok verbinden kannst. Kontaktiere den Cyro-Support, wenn er keinen Zugriff hat.",
    "O criador anterior deve desconectar este perfil antes que você possa conectar o TikTok. Fale com o suporte do Cyro se ele não puder acessá-lo."
  ],
  [
    "Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET on the host, register the HTTPS TikTok callback, and enable Login Kit plus video.list in the TikTok app. Sandbox access is limited to its target users until TikTok approves production access.",
    "Définissez TIKTOK_CLIENT_KEY et TIKTOK_CLIENT_SECRET sur l’hébergement, enregistrez le rappel HTTPS TikTok et activez Login Kit et video.list dans l’application TikTok. Le bac à sable est limité aux utilisateurs ciblés jusqu’à l’approbation de l’accès en production.",
    "Configura TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en el alojamiento, registra el callback HTTPS de TikTok y activa Login Kit y video.list en la aplicación de TikTok. El entorno de pruebas se limita a sus usuarios objetivo hasta la aprobación del acceso de producción.",
    "Setze TIKTOK_CLIENT_KEY und TIKTOK_CLIENT_SECRET auf dem Host, registriere den HTTPS-TikTok-Callback und aktiviere Login Kit sowie video.list in der TikTok-App. Der Sandbox-Zugriff ist bis zur Produktionsfreigabe auf Zielnutzer beschränkt.",
    "Defina TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET na hospedagem, registre o callback HTTPS do TikTok e ative Login Kit e video.list no aplicativo do TikTok. O sandbox fica limitado aos usuários-alvo até a aprovação do acesso de produção."
  ],
  [
    "Invite tracking is disabled. Retained history remains available.",
    "Le suivi des invitations est désactivé. L’historique conservé reste disponible.",
    "El seguimiento de invitaciones está desactivado. El historial guardado sigue disponible.",
    "Die Einladungsverfolgung ist deaktiviert. Gespeicherter Verlauf bleibt verfügbar.",
    "O acompanhamento de convites está desativado. O histórico salvo continua disponível."
  ],
  [
    "Invite attribution is best effort. Ambiguous, vanity, and deleted invite joins are unknown. Logging works independently of challenges; it does not award referral credit.",
    "L’attribution des invitations est approximative. Les arrivées ambiguës, via une URL personnalisée ou une invitation supprimée sont inconnues. Le journal est indépendant des défis et n’accorde aucun crédit de parrainage.",
    "La atribución de invitaciones es aproximada. Las entradas ambiguas, por URL personalizada o invitaciones eliminadas figuran como desconocidas. El registro funciona aparte de los desafíos y no concede crédito por referidos.",
    "Die Einladungszuordnung ist nicht garantiert. Uneindeutige Beitritte, Vanity-URLs und gelöschte Einladungen bleiben unbekannt. Die Protokollierung läuft unabhängig von Challenges und vergibt keine Empfehlungswertung.",
    "A atribuição de convites é aproximada. Entradas ambíguas, por URL personalizada ou convites excluídos ficam desconhecidas. O registro funciona separado dos desafios e não concede crédito por indicação."
  ],
  [
    "Waiting for a valid invite/member baseline. Check Manage Server permission and Server Members intent. Joins remain unattributed until ready.",
    "En attente d’une référence valide d’invitations et de membres. Vérifiez Gérer le serveur et l’intention Membres du serveur. Les arrivées restent non attribuées en attendant.",
    "Esperando una base válida de invitaciones y miembros. Revisa Gestionar servidor y la intención de miembros del servidor. Las entradas quedan sin atribuir hasta entonces.",
    "Warte auf eine gültige Einladungs-/Mitgliederbasis. Prüfe Server verwalten und Server Members Intent. Beitritte bleiben bis dahin unzugeordnet.",
    "Aguardando uma base válida de convites e membros. Confira Gerenciar servidor e Server Members Intent. As entradas ficam sem atribuição até estar pronto."
  ],
  [
    "Unknown setting.",
    "Paramètre inconnu.",
    "Ajuste desconocido.",
    "Unbekannte Einstellung.",
    "Configuração desconhecida."
  ],
  [
    "Discord authentication service returned {status}. Please sign in again or try shortly.",
    "Le service d’authentification Discord a renvoyé {status}. Reconnectez-vous ou réessayez dans un instant.",
    "El servicio de autenticación de Discord devolvió {status}. Inicia sesión de nuevo o inténtalo en unos momentos.",
    "Der Discord-Authentifizierungsdienst gab {status} zurück. Melde dich erneut an oder versuche es gleich noch einmal.",
    "O serviço de autenticação do Discord retornou {status}. Entre novamente ou tente em instantes."
  ],
  [
    "Numeric setting must be between {min} and {max}.",
    "Le paramètre numérique doit être compris entre {min} et {max}.",
    "El ajuste numérico debe estar entre {min} y {max}.",
    "Die numerische Einstellung muss zwischen {min} und {max} liegen.",
    "A configuração numérica deve estar entre {min} e {max}."
  ],
  [
    "Cyro needs View Channel, Send Messages, and Send Polls in this channel.",
    "Cyro a besoin de Voir le salon, Envoyer des messages et Envoyer des sondages dans ce salon.",
    "Cyro necesita Ver canal, Enviar mensajes y Enviar encuestas en este canal.",
    "Cyro benötigt Kanal ansehen, Nachrichten senden und Umfragen senden in diesem Kanal.",
    "Cyro precisa de Ver canal, Enviar mensagens e Enviar enquetes neste canal."
  ],
  [
    "Cyro needs View Channel, Send Messages, and Embed Links in this channel.",
    "Cyro a besoin de Voir le salon, Envoyer des messages et Intégrer des liens dans ce salon.",
    "Cyro necesita Ver canal, Enviar mensajes e Insertar enlaces en este canal.",
    "Cyro benötigt Kanal ansehen, Nachrichten senden und Links einbetten in diesem Kanal.",
    "Cyro precisa de Ver canal, Enviar mensagens e Inserir links neste canal."
  ]
];

const CONTROL_ERROR_ROWS: Row[] = [
  [
    "Access roles must be regular roles belonging to this server.",
    "Les rôles d’accès doivent être des rôles classiques de ce serveur.",
    "Los roles de acceso deben ser roles normales de este servidor.",
    "Zugriffsrollen müssen normale Rollen dieses Servers sein.",
    "Os cargos de acesso devem ser cargos comuns deste servidor."
  ],
  [
    "Upload a PNG, JPEG or WebP picture no larger than 2 MB.",
    "Importez une image PNG, JPEG ou WebP de 2 Mo maximum.",
    "Sube una imagen PNG, JPEG o WebP de hasta 2 MB.",
    "Lade ein PNG-, JPEG- oder WebP-Bild mit höchstens 2 MB hoch.",
    "Envie uma imagem PNG, JPEG ou WebP de até 2 MB."
  ],
  [
    "Upload a valid PNG, JPEG or WebP picture.",
    "Importez une image PNG, JPEG ou WebP valide.",
    "Sube una imagen PNG, JPEG o WebP válida.",
    "Lade ein gültiges PNG-, JPEG- oder WebP-Bild hoch.",
    "Envie uma imagem PNG, JPEG ou WebP válida."
  ],
  [
    "Upload a valid picture no larger than 2 MB.",
    "Importez une image valide de 2 Mo maximum.",
    "Sube una imagen válida de hasta 2 MB.",
    "Lade ein gültiges Bild mit höchstens 2 MB hoch.",
    "Envie uma imagem válida de até 2 MB."
  ],
  [
    "Use a PNG, JPEG or WebP picture with dimensions between 1 and 4096 pixels.",
    "Utilisez une image PNG, JPEG ou WebP dont les dimensions sont comprises entre 1 et 4096 pixels.",
    "Usa una imagen PNG, JPEG o WebP con dimensiones de entre 1 y 4096 píxeles.",
    "Verwende ein PNG-, JPEG- oder WebP-Bild mit Abmessungen zwischen 1 und 4096 Pixeln.",
    "Use uma imagem PNG, JPEG ou WebP com dimensões entre 1 e 4096 pixels."
  ],
  [
    "This picture could not be decoded. Export it as a PNG, JPEG or WebP and try again.",
    "Cette image n’a pas pu être décodée. Exportez-la en PNG, JPEG ou WebP et réessayez.",
    "No se pudo decodificar esta imagen. Expórtala como PNG, JPEG o WebP e inténtalo de nuevo.",
    "Dieses Bild konnte nicht dekodiert werden. Exportiere es als PNG, JPEG oder WebP und versuche es erneut.",
    "Não foi possível decodificar esta imagem. Exporte como PNG, JPEG ou WebP e tente novamente."
  ],
  [
    "Send a server nickname or profile picture.",
    "Envoyez un surnom de serveur ou une photo de profil.",
    "Envía un apodo del servidor o una imagen de perfil.",
    "Sende einen Server-Spitznamen oder ein Profilbild.",
    "Envie um apelido do servidor ou uma foto de perfil."
  ],
  [
    "Only a server nickname and profile picture can be changed.",
    "Seuls le surnom de serveur et la photo de profil peuvent être modifiés.",
    "Solo se pueden cambiar el apodo del servidor y la imagen de perfil.",
    "Nur der Server-Spitzname und das Profilbild können geändert werden.",
    "Somente o apelido do servidor e a foto de perfil podem ser alterados."
  ],
  [
    "Use a server nickname of up to 32 characters without line breaks or control characters.",
    "Utilisez un surnom de serveur de 32 caractères maximum, sans sauts de ligne ni caractères de contrôle.",
    "Usa un apodo del servidor de hasta 32 caracteres, sin saltos de línea ni caracteres de control.",
    "Verwende einen Server-Spitznamen mit bis zu 32 Zeichen ohne Zeilenumbrüche oder Steuerzeichen.",
    "Use um apelido do servidor de até 32 caracteres, sem quebras de linha nem caracteres de controle."
  ],
  [
    "Discord could not load the current server profile. Reload before making a change.",
    "Discord n’a pas pu charger le profil actuel du serveur. Rechargez avant toute modification.",
    "Discord no pudo cargar el perfil actual del servidor. Recarga antes de hacer cambios.",
    "Discord konnte das aktuelle Serverprofil nicht laden. Lade es vor einer Änderung neu.",
    "O Discord não conseguiu carregar o perfil atual do servidor. Recarregue antes de alterar."
  ],
  [
    "Discord did not return this server’s bot profile.",
    "Discord n’a pas renvoyé le profil du bot de ce serveur.",
    "Discord no devolvió el perfil del bot de este servidor.",
    "Discord hat das Bot-Profil dieses Servers nicht zurückgegeben.",
    "O Discord não retornou o perfil do bot deste servidor."
  ],
  [
    "A server profile change is already in progress. Wait for it to finish, then reload.",
    "Une modification du profil serveur est déjà en cours. Attendez la fin puis rechargez.",
    "Ya hay un cambio de perfil en curso. Espera a que termine y recarga.",
    "Eine Serverprofil-Änderung läuft bereits. Warte auf den Abschluss und lade dann neu.",
    "Uma alteração do perfil do servidor já está em andamento. Aguarde o término e recarregue."
  ],
  [
    "Profile uploads are busy. Wait a moment before trying again.",
    "L’importation des profils est occupée. Patientez avant de réessayer.",
    "Las subidas de perfiles están ocupadas. Espera un momento antes de intentarlo de nuevo.",
    "Profil-Uploads sind ausgelastet. Warte einen Moment vor einem weiteren Versuch.",
    "Os envios de perfis estão ocupados. Aguarde um momento antes de tentar novamente."
  ],
  [
    "Cyro needs the Change Nickname permission in this server to change its server name.",
    "Cyro a besoin de la permission Changer le pseudo dans ce serveur pour modifier son nom.",
    "Cyro necesita el permiso Cambiar apodo en este servidor para cambiar su nombre.",
    "Cyro benötigt Spitznamen ändern auf diesem Server, um seinen Servernamen zu ändern.",
    "Cyro precisa da permissão Alterar apelido neste servidor para mudar seu nome."
  ],
  [
    "Discord denied this server profile change. Check Cyro’s permissions in this server.",
    "Discord a refusé cette modification de profil. Vérifiez les permissions de Cyro dans ce serveur.",
    "Discord rechazó este cambio de perfil. Revisa los permisos de Cyro en este servidor.",
    "Discord hat die Serverprofil-Änderung abgelehnt. Prüfe Cyros Berechtigungen auf diesem Server.",
    "O Discord negou esta alteração de perfil. Confira as permissões do Cyro neste servidor."
  ],
  [
    "Discord rejected this name or picture. Try a different name or export the picture as a PNG.",
    "Discord a refusé ce nom ou cette image. Essayez un autre nom ou exportez l’image en PNG.",
    "Discord rechazó este nombre o imagen. Prueba otro nombre o exporta la imagen como PNG.",
    "Discord hat diesen Namen oder dieses Bild abgelehnt. Versuche einen anderen Namen oder exportiere das Bild als PNG.",
    "O Discord rejeitou este nome ou imagem. Tente outro nome ou exporte a imagem como PNG."
  ],
  [
    "Discord is limiting profile changes. Wait a few minutes, then reload before changing it again.",
    "Discord limite les modifications de profil. Attendez quelques minutes puis rechargez avant de réessayer.",
    "Discord está limitando los cambios de perfil. Espera unos minutos y recarga antes de cambiarlo de nuevo.",
    "Discord begrenzt Profiländerungen. Warte einige Minuten und lade vor der nächsten Änderung neu.",
    "O Discord está limitando as alterações de perfil. Aguarde alguns minutos e recarregue antes de alterar novamente."
  ],
  [
    "Discord did not confirm the profile change. Reload the current profile before trying again.",
    "Discord n’a pas confirmé la modification du profil. Rechargez le profil actuel avant de réessayer.",
    "Discord no confirmó el cambio de perfil. Recarga el perfil actual antes de intentarlo de nuevo.",
    "Discord hat die Profiländerung nicht bestätigt. Lade das aktuelle Profil vor einem weiteren Versuch neu.",
    "O Discord não confirmou a alteração de perfil. Recarregue o perfil atual antes de tentar novamente."
  ],
  [
    "Choose English, French, Spanish, German, Portuguese, or Follow Discord.",
    "Choisissez anglais, français, espagnol, allemand, portugais ou Suivre Discord.",
    "Elige inglés, francés, español, alemán, portugués o Seguir Discord.",
    "Wähle Englisch, Französisch, Spanisch, Deutsch, Portugiesisch oder Discord folgen.",
    "Escolha inglês, francês, espanhol, alemão, português ou Seguir Discord."
  ],
  [
    "Invalid language settings.",
    "Paramètres de langue non valides.",
    "Ajustes de idioma no válidos.",
    "Ungültige Spracheinstellungen.",
    "Configurações de idioma inválidas."
  ],
  [
    "Send a message or poll object.",
    "Envoyez un objet message ou sondage.",
    "Envía un objeto de mensaje o encuesta.",
    "Sende ein Nachrichten- oder Umfrageobjekt.",
    "Envie um objeto de mensagem ou enquete."
  ],
  [
    "Use an HTTPS image or link URL without credentials.",
    "Utilisez une URL HTTPS d’image ou de lien sans identifiants.",
    "Usa una URL HTTPS de imagen o enlace sin credenciales.",
    "Verwende eine HTTPS-Bild- oder Link-URL ohne Zugangsdaten.",
    "Use uma URL HTTPS de imagem ou link sem credenciais."
  ],
  [
    "Use at most 25 embed fields.",
    "Utilisez au maximum 25 champs intégrés.",
    "Usa como máximo 25 campos en el mensaje insertado.",
    "Verwende höchstens 25 Einbettungsfelder.",
    "Use no máximo 25 campos na mensagem incorporada."
  ],
  [
    "Field inline must be true or false.",
    "L’option en ligne du champ doit être vraie ou fausse.",
    "La opción en línea del campo debe ser verdadera o falsa.",
    "Feld nebeneinander muss wahr oder falsch sein.",
    "A opção em linha do campo deve ser verdadeira ou falsa."
  ],
  [
    "Embed text must total 6,000 characters or fewer.",
    "Le texte intégré doit contenir au total 6 000 caractères maximum.",
    "El texto insertado no debe superar los 6.000 caracteres en total.",
    "Der gesamte Einbettungstext darf höchstens 6.000 Zeichen enthalten.",
    "O texto incorporado deve ter no máximo 6.000 caracteres no total."
  ],
  [
    "Choose a six-digit embed color or no color bar.",
    "Choisissez une couleur intégrée à six chiffres ou aucune barre colorée.",
    "Elige un color de seis dígitos o ninguna barra de color.",
    "Wähle eine sechsstellige Einbettungsfarbe oder keinen Farbbalken.",
    "Escolha uma cor de seis dígitos ou nenhuma barra de cor."
  ],
  [
    "Add some content to the embed.",
    "Ajoutez du contenu au message intégré.",
    "Añade contenido al mensaje insertado.",
    "Füge der Einbettung Inhalt hinzu.",
    "Adicione conteúdo à mensagem incorporada."
  ],
  [
    "Add a message or embed before publishing.",
    "Ajoutez un message ou une intégration avant de publier.",
    "Añade un mensaje o contenido insertado antes de publicar.",
    "Füge vor dem Veröffentlichen eine Nachricht oder Einbettung hinzu.",
    "Adicione uma mensagem ou conteúdo incorporado antes de publicar."
  ],
  [
    "Add between 2 and 10 answers.",
    "Ajoutez entre 2 et 10 réponses.",
    "Añade entre 2 y 10 respuestas.",
    "Füge 2 bis 10 Antworten hinzu.",
    "Adicione de 2 a 10 respostas."
  ],
  [
    "Each poll answer must be different.",
    "Chaque réponse du sondage doit être différente.",
    "Cada respuesta de la encuesta debe ser distinta.",
    "Jede Umfrageantwort muss unterschiedlich sein.",
    "Cada resposta da enquete deve ser diferente."
  ],
  [
    "Poll duration must be 1–768 hours.",
    "La durée du sondage doit être de 1 à 768 heures.",
    "La duración de la encuesta debe ser de 1 a 768 horas.",
    "Die Umfragedauer muss 1–768 Stunden betragen.",
    "A duração da enquete deve ser de 1 a 768 horas."
  ],
  [
    "Choose single or multiple answers.",
    "Choisissez une ou plusieurs réponses.",
    "Elige una o varias respuestas.",
    "Wähle eine oder mehrere Antworten.",
    "Escolha uma ou várias respostas."
  ],
  [
    "Polls need a regular text channel.",
    "Les sondages nécessitent un salon textuel classique.",
    "Las encuestas necesitan un canal de texto normal.",
    "Umfragen benötigen einen normalen Textkanal.",
    "As enquetes precisam de um canal de texto comum."
  ],
  [
    "Choose a channel and use a valid publish request.",
    "Choisissez un salon et utilisez une requête de publication valide.",
    "Elige un canal y usa una solicitud de publicación válida.",
    "Wähle einen Kanal und verwende eine gültige Veröffentlichungsanfrage.",
    "Escolha um canal e use uma solicitação de publicação válida."
  ],
  [
    "This publish request was already used for different content.",
    "Cette requête de publication a déjà été utilisée pour un autre contenu.",
    "Esta solicitud de publicación ya se usó para otro contenido.",
    "Diese Veröffentlichungsanfrage wurde bereits für andere Inhalte verwendet.",
    "Esta solicitação de publicação já foi usada para outro conteúdo."
  ],
  [
    "The earlier send has an unknown outcome. Check the channel before starting a new post; Cyro will not repeat it automatically.",
    "Le résultat de l’envoi précédent est inconnu. Vérifiez le salon avant de créer un nouveau message ; Cyro ne le renverra pas automatiquement.",
    "Se desconoce el resultado del envío anterior. Revisa el canal antes de crear otra publicación; Cyro no la repetirá automáticamente.",
    "Das Ergebnis des vorherigen Versands ist unbekannt. Prüfe den Kanal vor einem neuen Beitrag; Cyro wiederholt ihn nicht automatisch.",
    "O resultado do envio anterior é desconhecido. Confira o canal antes de criar outra publicação; Cyro não a repetirá automaticamente."
  ],
  [
    "Publishing has too many unconfirmed sends. Contact the bot operator.",
    "Trop d’envois restent non confirmés. Contactez le responsable du bot.",
    "Hay demasiados envíos sin confirmar. Contacta con el operador del bot.",
    "Zu viele Sendungen sind unbestätigt. Kontaktiere den Bot-Betreiber.",
    "Há muitos envios não confirmados. Entre em contato com o operador do bot."
  ],
  [
    "Wait a minute before publishing more messages.",
    "Attendez une minute avant de publier d’autres messages.",
    "Espera un minuto antes de publicar más mensajes.",
    "Warte eine Minute, bevor du weitere Nachrichten veröffentlichst.",
    "Aguarde um minuto antes de publicar mais mensagens."
  ],
  [
    "This poll is not in this server’s publishing history.",
    "Ce sondage ne figure pas dans l’historique de publication de ce serveur.",
    "Esta encuesta no está en el historial de publicaciones de este servidor.",
    "Diese Umfrage ist nicht im Veröffentlichungsverlauf dieses Servers.",
    "Esta enquete não está no histórico de publicações deste servidor."
  ],
  [
    "This is not a Cyro poll.",
    "Ce sondage n’a pas été créé par Cyro.",
    "Esta no es una encuesta de Cyro.",
    "Dies ist keine Cyro-Umfrage.",
    "Esta não é uma enquete do Cyro."
  ],
  [
    "Invalid access settings.",
    "Paramètres d’accès non valides.",
    "Ajustes de acceso no válidos.",
    "Ungültige Zugriffseinstellungen.",
    "Configurações de acesso inválidas."
  ],
  [
    "Select up to 25 server roles.",
    "Choisissez jusqu’à 25 rôles de serveur.",
    "Elige hasta 25 roles del servidor.",
    "Wähle bis zu 25 Serverrollen.",
    "Escolha até 25 cargos do servidor."
  ],
  [
    "Invalid command role settings.",
    "Paramètres des rôles de commandes non valides.",
    "Ajustes de roles para comandos no válidos.",
    "Ungültige Befehlsrollen-Einstellungen.",
    "Configurações de cargos para comandos inválidas."
  ],
  [
    "Unknown command in access settings.",
    "Commande inconnue dans les paramètres d’accès.",
    "Comando desconocido en los ajustes de acceso.",
    "Unbekannter Befehl in den Zugriffseinstellungen.",
    "Comando desconhecido nas configurações de acesso."
  ],
  [
    "Cyro needs Manage Roles in this server.",
    "Cyro a besoin de Gérer les rôles dans ce serveur.",
    "Cyro necesita Gestionar roles en este servidor.",
    "Cyro benötigt Rollen verwalten auf diesem Server.",
    "Cyro precisa de Gerenciar cargos neste servidor."
  ],
  [
    "Choose a role belonging to this server.",
    "Choisissez un rôle appartenant à ce serveur.",
    "Elige un rol de este servidor.",
    "Wähle eine Rolle dieses Servers.",
    "Escolha um cargo deste servidor."
  ],
  [
    "Dashboard and command access roles cannot be status rewards.",
    "Les rôles d’accès au tableau de bord et aux commandes ne peuvent pas être des récompenses de statut.",
    "Los roles de acceso al panel y a comandos no pueden ser recompensas por estado.",
    "Zugriffsrollen für Dashboard und Befehle dürfen keine Statusbelohnungen sein.",
    "Cargos de acesso ao painel e a comandos não podem ser recompensas por status."
  ],
  [
    "Status roles are stopping. Try again shortly.",
    "Les rôles de statut sont en cours d’arrêt. Réessayez dans un instant.",
    "Los roles por estado se están deteniendo. Inténtalo en unos momentos.",
    "Statusrollen werden beendet. Versuche es gleich erneut.",
    "Os cargos por status estão sendo encerrados. Tente novamente em instantes."
  ],
  [
    "Enable the Presence Intent for Cyro and restart the bot before enabling status roles.",
    "Activez l’intention de présence pour Cyro et redémarrez le bot avant d’activer les rôles de statut.",
    "Activa Presence Intent para Cyro y reinicia el bot antes de activar los roles por estado.",
    "Aktiviere Presence Intent für Cyro und starte den Bot neu, bevor du Statusrollen aktivierst.",
    "Ative Presence Intent para Cyro e reinicie o bot antes de ativar cargos por status."
  ],
  [
    "Choose an available, safe role belonging to this server.",
    "Choisissez un rôle disponible et sûr appartenant à ce serveur.",
    "Elige un rol disponible y seguro de este servidor.",
    "Wähle eine verfügbare, sichere Rolle dieses Servers.",
    "Escolha um cargo disponível e seguro deste servidor."
  ],
  [
    "The status reward role no longer exists.",
    "Le rôle de récompense de statut n’existe plus.",
    "El rol de recompensa por estado ya no existe.",
    "Die Statusbelohnungsrolle existiert nicht mehr.",
    "O cargo de recompensa por status não existe mais."
  ],
  [
    "Invalid status role settings.",
    "Paramètres de rôle de statut non valides.",
    "Ajustes de roles por estado no válidos.",
    "Ungültige Statusrollen-Einstellungen.",
    "Configurações de cargos por status inválidas."
  ],
  [
    "Choose valid status role settings and text of up to 128 characters.",
    "Choisissez des paramètres de rôle de statut valides et un texte de 128 caractères maximum.",
    "Elige ajustes válidos de roles por estado y un texto de hasta 128 caracteres.",
    "Wähle gültige Statusrollen-Einstellungen und einen Text mit bis zu 128 Zeichen.",
    "Escolha configurações válidas de cargos por status e um texto de até 128 caracteres."
  ],
  [
    "Choose a role and the custom status text before enabling status roles.",
    "Choisissez un rôle et le texte de statut personnalisé avant d’activer les rôles de statut.",
    "Elige un rol y el texto del estado personalizado antes de activar los roles por estado.",
    "Wähle eine Rolle und den benutzerdefinierten Statustext, bevor du Statusrollen aktivierst.",
    "Escolha um cargo e o texto do status personalizado antes de ativar cargos por status."
  ]
];

const COMMUNITY_ERROR_ROWS: Row[] = [
  [
    "Join format must be text, card, or both.",
    "Le format d’arrivée doit être texte, carte ou les deux.",
    "El formato de llegada debe ser texto, tarjeta o ambos.",
    "Das Beitrittsformat muss Text, Karte oder beides sein.",
    "O formato de entrada deve ser texto, cartão ou ambos."
  ],
  [
    "Goodbye format must be off, text, card, or both.",
    "Le format de départ doit être désactivé, texte, carte ou les deux.",
    "El formato de despedida debe ser desactivado, texto, tarjeta o ambos.",
    "Das Abschiedsformat muss Aus, Text, Karte oder beides sein.",
    "O formato de despedida deve ser desativado, texto, cartão ou ambos."
  ],
  [
    "Card text must be a single line.",
    "Le texte de la carte doit tenir sur une seule ligne.",
    "El texto de la tarjeta debe tener una sola línea.",
    "Der Kartentext darf nur eine Zeile enthalten.",
    "O texto do cartão deve ter apenas uma linha."
  ],
  [
    "Select a member card background.",
    "Choisissez un arrière-plan de carte de membre.",
    "Elige un fondo para la tarjeta de miembro.",
    "Wähle einen Hintergrund für die Mitgliederkarte.",
    "Escolha um fundo para o cartão de membro."
  ],
  [
    "Card colors must be six-digit hex colors.",
    "Les couleurs de la carte doivent être des codes hexadécimaux à six chiffres.",
    "Los colores de la tarjeta deben ser códigos hexadecimales de seis dígitos.",
    "Kartenfarben müssen sechsstellige Hex-Farben sein.",
    "As cores do cartão devem ser códigos hexadecimais de seis dígitos."
  ],
  [
    "Select left, top, or no card bar.",
    "Choisissez une barre à gauche, en haut ou aucune barre.",
    "Elige una barra a la izquierda, arriba o ninguna.",
    "Wähle einen Balken links, oben oder keinen Balken.",
    "Escolha uma barra à esquerda, no topo ou nenhuma."
  ],
  [
    "Select up to 10 automatic roles.",
    "Choisissez jusqu’à 10 rôles automatiques.",
    "Elige hasta 10 roles automáticos.",
    "Wähle bis zu 10 automatische Rollen.",
    "Escolha até 10 cargos automáticos."
  ],
  [
    "Select up to 20 self roles.",
    "Choisissez jusqu’à 20 rôles en libre-service.",
    "Elige hasta 20 roles de autoservicio.",
    "Wähle bis zu 20 Selbstwahlrollen.",
    "Escolha até 20 cargos autoatribuíveis."
  ],
  [
    "Self roles must be unique.",
    "Les rôles en libre-service doivent être distincts.",
    "Los roles de autoservicio deben ser distintos.",
    "Selbstwahlrollen dürfen nicht doppelt vorkommen.",
    "Os cargos autoatribuíveis devem ser distintos."
  ],
  [
    "Invite target must be an integer from 1 to 100000.",
    "L’objectif d’invitations doit être un entier de 1 à 100 000.",
    "El objetivo de invitaciones debe ser un entero de 1 a 100.000.",
    "Das Einladungsziel muss eine ganze Zahl von 1 bis 100.000 sein.",
    "A meta de convites deve ser um inteiro de 1 a 100.000."
  ],
  [
    "Verification mode must be reaction or challenge.",
    "Le mode de vérification doit être réaction ou défi.",
    "El modo de verificación debe ser reacción o desafío.",
    "Der Verifizierungsmodus muss Reaktion oder Aufgabe sein.",
    "O modo de verificação deve ser reação ou desafio."
  ],
  [
    "Select a verification channel and role.",
    "Choisissez un salon et un rôle de vérification.",
    "Elige un canal y un rol de verificación.",
    "Wähle einen Verifizierungskanal und eine Rolle.",
    "Escolha um canal e um cargo de verificação."
  ],
  [
    "The verification role cannot also be an automatic or self-assignable role.",
    "Le rôle de vérification ne peut pas aussi être automatique ou en libre-service.",
    "El rol de verificación no puede ser también automático o de autoservicio.",
    "Die Verifizierungsrolle darf nicht zugleich automatisch oder selbst zuweisbar sein.",
    "O cargo de verificação não pode ser também automático ou autoatribuível."
  ],
  [
    "Select a counting channel.",
    "Choisissez un salon de comptage.",
    "Elige un canal para contar.",
    "Wähle einen Zählkanal.",
    "Escolha um canal de contagem."
  ],
  [
    "Select a welcome channel.",
    "Choisissez un salon d’accueil.",
    "Elige un canal de bienvenida.",
    "Wähle einen Willkommenskanal.",
    "Escolha um canal de boas-vindas."
  ],
  [
    "Member card renderer is busy.",
    "Le générateur de cartes de membre est occupé.",
    "El generador de tarjetas de miembro está ocupado.",
    "Der Mitgliederkarten-Renderer ist ausgelastet.",
    "O gerador de cartões de membro está ocupado."
  ],
  [
    "Member card font is unavailable.",
    "La police des cartes de membre est indisponible.",
    "La fuente de las tarjetas de miembro no está disponible.",
    "Die Schrift für Mitgliederkarten ist nicht verfügbar.",
    "A fonte dos cartões de membro está indisponível."
  ],
  [
    "Community service is stopping.",
    "Le service communautaire s’arrête.",
    "El servicio de comunidad se está deteniendo.",
    "Der Community-Dienst wird beendet.",
    "O serviço da comunidade está sendo encerrado."
  ],
  [
    "The bot needs View Channel, Send Messages, and counting reaction/history permissions in the selected channel.",
    "Le bot a besoin de Voir le salon, Envoyer des messages et des permissions de réaction et d’historique pour le comptage dans ce salon.",
    "El bot necesita Ver canal, Enviar mensajes y permisos de reacciones e historial para contar en el canal elegido.",
    "Der Bot benötigt Kanal ansehen, Nachrichten senden sowie Reaktions- und Verlaufsrechte zum Zählen im gewählten Kanal.",
    "O bot precisa de Ver canal, Enviar mensagens e permissões de reações e histórico para contar no canal escolhido."
  ],
  [
    "The bot needs Attach Files in the welcome channel to send image cards.",
    "Le bot a besoin de Joindre des fichiers dans le salon d’accueil pour envoyer des cartes illustrées.",
    "El bot necesita Adjuntar archivos en el canal de bienvenida para enviar tarjetas con imágenes.",
    "Der Bot benötigt Dateien anhängen im Willkommenskanal, um Bildkarten zu senden.",
    "O bot precisa de Anexar arquivos no canal de boas-vindas para enviar cartões com imagens."
  ],
  [
    "The bot needs Manage Roles for automatic and self roles.",
    "Le bot a besoin de Gérer les rôles pour les rôles automatiques et en libre-service.",
    "El bot necesita Gestionar roles para los roles automáticos y de autoservicio.",
    "Der Bot benötigt Rollen verwalten für automatische Rollen und Selbstwahlrollen.",
    "O bot precisa de Gerenciar cargos para cargos automáticos e autoatribuíveis."
  ],
  [
    "A configured role does not exist in this server.",
    "Un rôle configuré n’existe pas dans ce serveur.",
    "Un rol configurado no existe en este servidor.",
    "Eine konfigurierte Rolle existiert auf diesem Server nicht.",
    "Um cargo configurado não existe neste servidor."
  ],
  [
    "The bot needs Manage Server to track invite uses.",
    "Le bot a besoin de Gérer le serveur pour suivre l’utilisation des invitations.",
    "El bot necesita Gestionar servidor para registrar el uso de invitaciones.",
    "Der Bot benötigt Server verwalten, um Einladungsnutzungen zu verfolgen.",
    "O bot precisa de Gerenciar servidor para acompanhar o uso dos convites."
  ],
  [
    "Select a regular text channel in this server for the invite log.",
    "Choisissez un salon textuel classique de ce serveur pour le journal d’invitations.",
    "Elige un canal de texto normal de este servidor para el registro de invitaciones.",
    "Wähle einen normalen Textkanal dieses Servers für das Einladungsprotokoll.",
    "Escolha um canal de texto comum deste servidor para o registro de convites."
  ],
  [
    "The bot needs View Channel, Send Messages and Embed Links in the invite log channel.",
    "Le bot a besoin de Voir le salon, Envoyer des messages et Intégrer des liens dans le salon du journal d’invitations.",
    "El bot necesita Ver canal, Enviar mensajes e Insertar enlaces en el canal del registro de invitaciones.",
    "Der Bot benötigt Kanal ansehen, Nachrichten senden und Links einbetten im Einladungsprotokoll-Kanal.",
    "O bot precisa de Ver canal, Enviar mensagens e Inserir links no canal de registro de convites."
  ],
  [
    "Discord did not return reliable invite usage counts. Check Manage Server permission.",
    "Discord n’a pas renvoyé de compteurs d’invitations fiables. Vérifiez la permission Gérer le serveur.",
    "Discord no devolvió recuentos fiables del uso de invitaciones. Revisa el permiso Gestionar servidor.",
    "Discord hat keine zuverlässigen Einladungszähler geliefert. Prüfe Server verwalten.",
    "O Discord não retornou contagens confiáveis de uso dos convites. Confira a permissão Gerenciar servidor."
  ],
  [
    "Invite tracking supports up to 100000 members per server in this single-process edition.",
    "Le suivi des invitations prend en charge jusqu’à 100 000 membres par serveur dans cette édition à processus unique.",
    "El seguimiento de invitaciones admite hasta 100.000 miembros por servidor en esta edición de proceso único.",
    "Die Einladungsverfolgung unterstützt in dieser Einzelprozess-Version bis zu 100.000 Mitglieder pro Server.",
    "O acompanhamento de convites suporta até 100.000 membros por servidor nesta edição de processo único."
  ],
  [
    "The invite log channel is missing or the bot cannot send embeds there.",
    "Le salon du journal d’invitations est introuvable ou le bot ne peut pas y envoyer de messages intégrés.",
    "El canal del registro de invitaciones no existe o el bot no puede enviar mensajes insertados allí.",
    "Der Einladungsprotokoll-Kanal fehlt oder der Bot kann dort keine Einbettungen senden.",
    "O canal de registro de convites está ausente ou o bot não pode enviar mensagens incorporadas nele."
  ],
  [
    "Attach Files permission is missing.",
    "La permission Joindre des fichiers est manquante.",
    "Falta el permiso Adjuntar archivos.",
    "Die Berechtigung Dateien anhängen fehlt.",
    "A permissão Anexar arquivos está ausente."
  ],
  [
    "Configured self role no longer exists.",
    "Le rôle en libre-service configuré n’existe plus.",
    "El rol de autoservicio configurado ya no existe.",
    "Die konfigurierte Selbstwahlrolle existiert nicht mehr.",
    "O cargo autoatribuível configurado não existe mais."
  ],
  [
    "Role no longer exists.",
    "Le rôle n’existe plus.",
    "El rol ya no existe.",
    "Die Rolle existiert nicht mehr.",
    "O cargo não existe mais."
  ],
  [
    "Invalid guild ID.",
    "Identifiant de serveur non valide.",
    "ID de servidor no válido.",
    "Ungültige Server-ID.",
    "ID de servidor inválido."
  ],
  [
    "Settings must be an object.",
    "Les paramètres doivent être un objet.",
    "Los ajustes deben ser un objeto.",
    "Einstellungen müssen ein Objekt sein.",
    "As configurações devem ser um objeto."
  ],
  [
    "Ticket close action must be archive or delete.",
    "L’action de fermeture du ticket doit être archiver ou supprimer.",
    "La acción al cerrar un ticket debe ser archivar o eliminar.",
    "Die Aktion beim Schließen muss Archivieren oder Löschen sein.",
    "A ação ao fechar o ticket deve ser arquivar ou excluir."
  ],
  [
    "Ticket visibility must be inherit or private.",
    "La visibilité du ticket doit être héritée ou privée.",
    "La visibilidad del ticket debe ser heredada o privada.",
    "Die Ticketsichtbarkeit muss Vererben oder Privat sein.",
    "A visibilidade do ticket deve ser herdada ou privada."
  ],
  [
    "Enabled settings must be true or false.",
    "Les paramètres d’activation doivent être vrais ou faux.",
    "Los ajustes de activación deben ser verdaderos o falsos.",
    "Aktivierungseinstellungen müssen wahr oder falsch sein.",
    "As configurações de ativação devem ser verdadeiras ou falsas."
  ],
  [
    "Channel and role IDs must be Discord IDs or null.",
    "Les identifiants de salons et de rôles doivent être des identifiants Discord ou null.",
    "Los IDs de canales y roles deben ser IDs de Discord o null.",
    "Kanal- und Rollen-IDs müssen Discord-IDs oder null sein.",
    "Os IDs de canais e cargos devem ser IDs do Discord ou null."
  ],
  [
    "Staff roles must be a list of up to 20 Discord role IDs.",
    "Les rôles de l’équipe doivent contenir jusqu’à 20 identifiants de rôles Discord.",
    "Los roles del equipo deben ser una lista de hasta 20 IDs de roles de Discord.",
    "Teamrollen müssen eine Liste mit bis zu 20 Discord-Rollen-IDs sein.",
    "Os cargos da equipe devem ser uma lista de até 20 IDs de cargos do Discord."
  ],
  [
    "Blocked words must contain up to 100 nonempty phrases of at most 80 characters.",
    "Les mots bloqués doivent contenir jusqu’à 100 expressions non vides de 80 caractères maximum.",
    "Las palabras bloqueadas deben contener hasta 100 frases no vacías de hasta 80 caracteres.",
    "Blockierte Wörter dürfen bis zu 100 nicht leere Ausdrücke mit höchstens 80 Zeichen enthalten.",
    "As palavras bloqueadas devem conter até 100 frases não vazias de no máximo 80 caracteres."
  ],
  [
    "Applications require 1–5 questions, each up to 100 characters.",
    "Les candidatures doivent contenir 1 à 5 questions de 100 caractères maximum chacune.",
    "Las solicitudes necesitan de 1 a 5 preguntas de hasta 100 caracteres cada una.",
    "Bewerbungen benötigen 1–5 Fragen mit jeweils bis zu 100 Zeichen.",
    "As candidaturas exigem de 1 a 5 perguntas de até 100 caracteres cada."
  ],
  [
    "Choose an archive category separate from the active ticket category.",
    "Choisissez une catégorie d’archives différente de celle des tickets actifs.",
    "Elige una categoría de archivo distinta de la de tickets activos.",
    "Wähle eine Archivkategorie, die sich von der aktiven Ticketkategorie unterscheidet.",
    "Escolha uma categoria de arquivo diferente da categoria de tickets ativos."
  ],
  [
    "Support definitions must contain only their required settings.",
    "Les définitions d’assistance ne doivent contenir que les paramètres requis.",
    "Las definiciones de soporte solo deben contener los ajustes requeridos.",
    "Support-Definitionen dürfen nur die erforderlichen Einstellungen enthalten.",
    "As definições de suporte devem conter apenas as configurações exigidas."
  ],
  [
    "Support IDs must use 1–40 lowercase letters, digits, dashes or underscores; default is reserved.",
    "Les identifiants d’assistance doivent contenir 1 à 40 lettres minuscules, chiffres, tirets ou traits de soulignement ; default est réservé.",
    "Los IDs de soporte deben tener de 1 a 40 letras minúsculas, dígitos, guiones o guiones bajos; default está reservado.",
    "Support-IDs müssen 1–40 Kleinbuchstaben, Ziffern, Bindestriche oder Unterstriche enthalten; default ist reserviert.",
    "Os IDs de suporte devem ter de 1 a 40 letras minúsculas, dígitos, hífens ou sublinhados; default é reservado."
  ],
  [
    "Staff roles must contain up to 20 unique Discord role IDs.",
    "Les rôles de l’équipe doivent contenir jusqu’à 20 identifiants Discord distincts.",
    "Los roles del equipo deben contener hasta 20 IDs de roles de Discord distintos.",
    "Teamrollen dürfen bis zu 20 eindeutige Discord-Rollen-IDs enthalten.",
    "Os cargos da equipe devem conter até 20 IDs de cargos do Discord distintos."
  ],
  [
    "Ticket type enabled must be true or false.",
    "L’activation du type de ticket doit être vraie ou fausse.",
    "La activación del tipo de ticket debe ser verdadera o falsa.",
    "Tickettyp aktiviert muss wahr oder falsch sein.",
    "A ativação do tipo de ticket deve ser verdadeira ou falsa."
  ],
  [
    "Ticket destinations must be Discord IDs or null.",
    "Les destinations des tickets doivent être des identifiants Discord ou null.",
    "Los destinos de tickets deben ser IDs de Discord o null.",
    "Ticketziele müssen Discord-IDs oder null sein.",
    "Os destinos dos tickets devem ser IDs do Discord ou null."
  ],
  [
    "Ticket limits must be between 1 and 5.",
    "Les limites de tickets doivent être comprises entre 1 et 5.",
    "Los límites de tickets deben estar entre 1 y 5.",
    "Ticketlimits müssen zwischen 1 und 5 liegen.",
    "Os limites de tickets devem ser de 1 a 5."
  ],
  [
    "Enabled ticket types need a category, transcript channel and staff roles.",
    "Les types de tickets activés nécessitent une catégorie, un salon de transcriptions et des rôles d’équipe.",
    "Los tipos de tickets activados necesitan una categoría, un canal de transcripciones y roles del equipo.",
    "Aktivierte Tickettypen benötigen eine Kategorie, einen Transkriptkanal und Teamrollen.",
    "Os tipos de ticket ativados precisam de categoria, canal de transcrições e cargos da equipe."
  ],
  [
    "Application form enabled must be true or false.",
    "L’activation du formulaire de candidature doit être vraie ou fausse.",
    "La activación del formulario de solicitud debe ser verdadera o falsa.",
    "Bewerbungsformular aktiviert muss wahr oder falsch sein.",
    "A ativação do formulário de candidatura deve ser verdadeira ou falsa."
  ],
  [
    "Application channel and role must be Discord IDs or null.",
    "Le salon et le rôle de candidature doivent être des identifiants Discord ou null.",
    "El canal y el rol de solicitudes deben ser IDs de Discord o null.",
    "Bewerbungskanal und -rolle müssen Discord-IDs oder null sein.",
    "O canal e o cargo de candidaturas devem ser IDs do Discord ou null."
  ],
  [
    "Applications require 1–5 questions.",
    "Les candidatures nécessitent 1 à 5 questions.",
    "Las solicitudes necesitan de 1 a 5 preguntas.",
    "Bewerbungen benötigen 1–5 Fragen.",
    "As candidaturas exigem de 1 a 5 perguntas."
  ],
  [
    "Enabled application forms need a review channel and reviewer roles.",
    "Les formulaires activés nécessitent un salon d’examen et des rôles d’évaluateurs.",
    "Los formularios activados necesitan un canal de revisión y roles de revisores.",
    "Aktivierte Bewerbungsformulare benötigen einen Prüfungskanal und Prüferrollen.",
    "Os formulários ativados precisam de um canal de avaliação e cargos de avaliadores."
  ],
  [
    "Panel kind must be tickets or applications.",
    "Le type de panneau doit être tickets ou candidatures.",
    "El tipo de panel debe ser tickets o solicitudes.",
    "Der Paneltyp muss Tickets oder Bewerbungen sein.",
    "O tipo de painel deve ser tickets ou candidaturas."
  ],
  [
    "Panel presentation must be buttons or select.",
    "Le panneau doit utiliser des boutons ou un menu déroulant.",
    "El panel debe usar botones o un menú desplegable.",
    "Das Panel muss Schaltflächen oder ein Auswahlmenü verwenden.",
    "O painel deve usar botões ou um menu suspenso."
  ],
  [
    "Panels require 1–25 options.",
    "Les panneaux nécessitent 1 à 25 options.",
    "Los paneles necesitan de 1 a 25 opciones.",
    "Panels benötigen 1–25 Optionen.",
    "Os painéis exigem de 1 a 25 opções."
  ],
  [
    "Panel options must be unique.",
    "Les options du panneau doivent être distinctes.",
    "Las opciones del panel deben ser distintas.",
    "Paneloptionen dürfen nicht doppelt vorkommen.",
    "As opções do painel devem ser distintas."
  ],
  [
    "Every panel option must reference a ticket type or application form in this server.",
    "Chaque option doit correspondre à un type de ticket ou un formulaire de candidature de ce serveur.",
    "Cada opción debe hacer referencia a un tipo de ticket o formulario de solicitud de este servidor.",
    "Jede Paneloption muss auf einen Tickettyp oder ein Bewerbungsformular dieses Servers verweisen.",
    "Cada opção deve se referir a um tipo de ticket ou formulário de candidatura deste servidor."
  ],
  [
    "Close existing tickets before changing support staff roles so their staff access stays consistent.",
    "Fermez les tickets existants avant de modifier les rôles d’assistance pour préserver la cohérence des accès.",
    "Cierra los tickets existentes antes de cambiar los roles de soporte para mantener sus accesos coherentes.",
    "Schließe vorhandene Tickets, bevor du Support-Teamrollen änderst, damit deren Zugriff konsistent bleibt.",
    "Feche os tickets existentes antes de alterar os cargos de suporte para manter os acessos consistentes."
  ],
  [
    "Review all pending applications before changing the review channel or reviewer roles.",
    "Examinez toutes les candidatures en attente avant de modifier le salon d’examen ou les rôles d’évaluateurs.",
    "Revisa todas las solicitudes pendientes antes de cambiar el canal de revisión o los roles de revisores.",
    "Prüfe alle offenen Bewerbungen, bevor du den Prüfungskanal oder Prüferrollen änderst.",
    "Avalie todas as candidaturas pendentes antes de alterar o canal de avaliação ou os cargos de avaliadores."
  ],
  [
    "Staff roles must be regular roles in this server.",
    "Les rôles de l’équipe doivent être des rôles classiques de ce serveur.",
    "Los roles del equipo deben ser roles normales de este servidor.",
    "Teamrollen müssen normale Rollen dieses Servers sein.",
    "Os cargos da equipe devem ser cargos comuns deste servidor."
  ],
  [
    "Ticket categories must be categories in this server.",
    "Les catégories de tickets doivent appartenir à ce serveur.",
    "Las categorías de tickets deben pertenecer a este servidor.",
    "Ticketkategorien müssen Kategorien dieses Servers sein.",
    "As categorias de tickets devem pertencer a este servidor."
  ],
  [
    "Delete-after-transcript requires Manage Threads and Manage Webhooks for Cyro in the selected ticket category. Grant those permissions or keep a read-only archive.",
    "La suppression après transcription nécessite Gérer les fils et Gérer les webhooks pour Cyro dans la catégorie choisie. Accordez ces permissions ou conservez une archive en lecture seule.",
    "Eliminar tras transcribir requiere Gestionar hilos y Gestionar webhooks para Cyro en la categoría elegida. Concede esos permisos o conserva un archivo de solo lectura.",
    "Löschen nach Transkription benötigt Threads verwalten und Webhooks verwalten für Cyro in der gewählten Kategorie. Erteile diese Rechte oder behalte ein schreibgeschütztes Archiv.",
    "Excluir após transcrever exige Gerenciar tópicos e Gerenciar webhooks para Cyro na categoria escolhida. Conceda essas permissões ou mantenha um arquivo somente leitura."
  ],
  [
    "Tickets require a category, transcript channel, and at least one staff role.",
    "Les tickets nécessitent une catégorie, un salon de transcriptions et au moins un rôle d’équipe.",
    "Los tickets necesitan una categoría, un canal de transcripciones y al menos un rol del equipo.",
    "Tickets benötigen eine Kategorie, einen Transkriptkanal und mindestens eine Teamrolle.",
    "Os tickets precisam de categoria, canal de transcrições e pelo menos um cargo da equipe."
  ],
  [
    "Acceptance role does not exist in this server.",
    "Le rôle d’acceptation n’existe pas dans ce serveur.",
    "El rol de aceptación no existe en este servidor.",
    "Die Annahmerolle existiert auf diesem Server nicht.",
    "O cargo de aprovação não existe neste servidor."
  ],
  [
    "Applications require a review channel and at least one reviewer role.",
    "Les candidatures nécessitent un salon d’examen et au moins un rôle d’évaluateur.",
    "Las solicitudes necesitan un canal de revisión y al menos un rol de revisor.",
    "Bewerbungen benötigen einen Prüfungskanal und mindestens eine Prüferrolle.",
    "As candidaturas precisam de um canal de avaliação e pelo menos um cargo de avaliador."
  ]
];

const STREAM_ERROR_ROWS: Row[] = [
  [
    "Expected stream settings.",
    "Des paramètres de diffusion sont attendus.",
    "Se esperaban ajustes de transmisión.",
    "Stream-Einstellungen erwartet.",
    "Eram esperadas configurações de transmissão."
  ],
  [
    "Choose a valid creator profile.",
    "Choisissez un profil de créateur valide.",
    "Elige un perfil de creador válido.",
    "Wähle ein gültiges Creator-Profil.",
    "Escolha um perfil de criador válido."
  ],
  [
    "Enabled must be true or false.",
    "L’activation doit être vraie ou fausse.",
    "La activación debe ser verdadera o falsa.",
    "Aktiviert muss wahr oder falsch sein.",
    "A ativação deve ser verdadeira ou falsa."
  ],
  [
    "Cooldown must be between 0 and 86400 seconds.",
    "Le délai doit être compris entre 0 et 86 400 secondes.",
    "El intervalo debe estar entre 0 y 86.400 segundos.",
    "Die Wartezeit muss zwischen 0 und 86.400 Sekunden liegen.",
    "O intervalo deve ser de 0 a 86.400 segundos."
  ],
  [
    "Choose delete, offline or keep for cleanup.",
    "Choisissez supprimer, hors ligne ou conserver pour le nettoyage.",
    "Elige eliminar, desconectado o conservar para la limpieza.",
    "Wähle Löschen, Offline oder Behalten für die Bereinigung.",
    "Escolha excluir, offline ou manter para a limpeza."
  ],
  [
    "Expected upload notification settings.",
    "Des paramètres de notification de vidéos sont attendus.",
    "Se esperaban ajustes de avisos de videos.",
    "Einstellungen für Video-Benachrichtigungen erwartet.",
    "Eram esperadas configurações de alertas de vídeos."
  ],
  [
    "Unknown upload setting.",
    "Paramètre de vidéo inconnu.",
    "Ajuste de videos desconocido.",
    "Unbekannte Video-Einstellung.",
    "Configuração de vídeos desconhecida."
  ],
  [
    "Upload enabled must be true or false.",
    "L’activation des alertes vidéo doit être vraie ou fausse.",
    "La activación de avisos de videos debe ser verdadera o falsa.",
    "Video-Benachrichtigungen aktiviert muss wahr oder falsch sein.",
    "A ativação de alertas de vídeos deve ser verdadeira ou falsa."
  ],
  [
    "Choose a valid upload channel.",
    "Choisissez un salon de vidéos valide.",
    "Elige un canal de videos válido.",
    "Wähle einen gültigen Video-Kanal.",
    "Escolha um canal de vídeos válido."
  ],
  [
    "Choose a valid upload ping role.",
    "Choisissez un rôle de mention valide pour les vidéos.",
    "Elige un rol válido para mencionar en avisos de videos.",
    "Wähle eine gültige Rolle für Video-Erwähnungen.",
    "Escolha um cargo válido para mencionar nos alertas de vídeos."
  ],
  [
    "Choose a text channel where the bot can view, send messages, embed links and read history.",
    "Choisissez un salon textuel où le bot peut voir le salon, envoyer des messages, intégrer des liens et lire l’historique.",
    "Elige un canal de texto donde el bot pueda verlo, enviar mensajes, insertar enlaces y leer el historial.",
    "Wähle einen Textkanal, in dem der Bot sehen, Nachrichten senden, Links einbetten und den Verlauf lesen kann.",
    "Escolha um canal de texto onde o bot possa ver o canal, enviar mensagens, inserir links e ler o histórico."
  ],
  [
    "Choose an existing ping role.",
    "Choisissez un rôle de mention existant.",
    "Elige un rol de mención existente.",
    "Wähle eine vorhandene Erwähnungsrolle.",
    "Escolha um cargo de menção existente."
  ],
  [
    "The ping role must be mentionable, or the bot needs Mention Everyone in this channel.",
    "Le rôle doit pouvoir être mentionné, ou le bot doit avoir la permission Mentionner @everyone dans ce salon.",
    "El rol debe poder mencionarse, o el bot necesita el permiso Mencionar a @everyone en este canal.",
    "Die Rolle muss erwähnbar sein, oder der Bot benötigt Alle erwähnen in diesem Kanal.",
    "O cargo deve permitir menções, ou o bot precisa de Mencionar @everyone neste canal."
  ],
  [
    "The bot needs Manage Roles and an existing live role.",
    "Le bot a besoin de Gérer les rôles et d’un rôle de direct existant.",
    "El bot necesita Gestionar roles y un rol de directo existente.",
    "Der Bot benötigt Rollen verwalten und eine vorhandene Live-Rolle.",
    "O bot precisa de Gerenciar cargos e de um cargo de ao vivo existente."
  ],
  [
    "Choose the Discord member who receives the live role.",
    "Choisissez le membre Discord qui reçoit le rôle de direct.",
    "Elige al miembro de Discord que recibirá el rol de directo.",
    "Wähle das Discord-Mitglied, das die Live-Rolle erhält.",
    "Escolha o membro do Discord que receberá o cargo de ao vivo."
  ],
  [
    "Upload notifications are available for YouTube and connected TikTok creators.",
    "Les notifications de vidéos sont disponibles pour YouTube et les créateurs TikTok connectés.",
    "Los avisos de videos están disponibles para YouTube y los creadores de TikTok conectados.",
    "Video-Benachrichtigungen sind für YouTube und verbundene TikTok-Creator verfügbar.",
    "Os alertas de vídeos estão disponíveis para o YouTube e criadores conectados do TikTok."
  ],
  [
    "Choose an upload text channel where the bot can view, send messages and embed links.",
    "Choisissez un salon textuel pour les vidéos où le bot peut voir le salon, envoyer des messages et intégrer des liens.",
    "Elige un canal de texto para videos donde el bot pueda verlo, enviar mensajes e insertar enlaces.",
    "Wähle einen Textkanal für Videos, in dem der Bot sehen, Nachrichten senden und Links einbetten kann.",
    "Escolha um canal de texto para vídeos onde o bot possa ver o canal, enviar mensagens e inserir links."
  ],
  [
    "Choose an existing upload ping role.",
    "Choisissez un rôle de mention existant pour les vidéos.",
    "Elige un rol existente para mencionar en avisos de videos.",
    "Wähle eine vorhandene Rolle für Video-Erwähnungen.",
    "Escolha um cargo existente para mencionar nos alertas de vídeos."
  ],
  [
    "The upload ping role must be mentionable, or the bot needs Mention Everyone in that channel.",
    "Le rôle des vidéos doit pouvoir être mentionné, ou le bot doit avoir Mentionner @everyone dans ce salon.",
    "El rol de videos debe poder mencionarse, o el bot necesita Mencionar a @everyone en ese canal.",
    "Die Video-Rolle muss erwähnbar sein, oder der Bot benötigt Alle erwähnen in diesem Kanal.",
    "O cargo dos alertas de vídeos deve permitir menções, ou o bot precisa de Mencionar @everyone nesse canal."
  ],
  [
    "The linked member must belong to this server.",
    "Le membre associé doit appartenir à ce serveur.",
    "El miembro vinculado debe pertenecer a este servidor.",
    "Das verknüpfte Mitglied muss diesem Server angehören.",
    "O membro vinculado deve pertencer a este servidor."
  ],
  [
    "Choose a platform and a username (up to 100 characters).",
    "Choisissez une plateforme et un nom d’utilisateur de 100 caractères maximum.",
    "Elige una plataforma y un nombre de usuario de hasta 100 caracteres.",
    "Wähle eine Plattform und einen Benutzernamen mit bis zu 100 Zeichen.",
    "Escolha uma plataforma e um nome de usuário de até 100 caracteres."
  ],
  [
    "This server has reached the limit of 100 tracked streamers.",
    "Ce serveur a atteint la limite de 100 streamers suivis.",
    "Este servidor alcanzó el límite de 100 streamers seguidos.",
    "Dieser Server hat das Limit von 100 verfolgten Streamern erreicht.",
    "Este servidor atingiu o limite de 100 streamers monitorados."
  ],
  [
    "Edit the Discord member on the creator profile to update all linked accounts together.",
    "Modifiez le membre Discord du profil créateur pour mettre à jour tous les comptes associés ensemble.",
    "Edita el miembro de Discord en el perfil del creador para actualizar todas las cuentas vinculadas a la vez.",
    "Bearbeite das Discord-Mitglied im Creator-Profil, um alle verknüpften Konten gemeinsam zu aktualisieren.",
    "Edite o membro do Discord no perfil do criador para atualizar todas as contas vinculadas juntas."
  ],
  [
    "Stream not found in this server.",
    "Diffusion introuvable dans ce serveur.",
    "Transmisión no encontrada en este servidor.",
    "Stream auf diesem Server nicht gefunden.",
    "Transmissão não encontrada neste servidor."
  ],
  [
    "Choose a creator account.",
    "Choisissez un compte créateur.",
    "Elige una cuenta de creador.",
    "Wähle ein Creator-Konto.",
    "Escolha uma conta de criador."
  ],
  [
    "Choose a valid server and creator account.",
    "Choisissez un serveur et un compte créateur valides.",
    "Elige un servidor y una cuenta de creador válidos.",
    "Wähle einen gültigen Server und ein gültiges Creator-Konto.",
    "Escolha um servidor e uma conta de criador válidos."
  ],
  [
    "TikTok creator account not found in this server.",
    "Compte créateur TikTok introuvable dans ce serveur.",
    "Cuenta de creador de TikTok no encontrada en este servidor.",
    "TikTok-Creator-Konto auf diesem Server nicht gefunden.",
    "Conta de criador do TikTok não encontrada neste servidor."
  ],
  [
    "Only the Discord member linked to this creator can connect their TikTok account. Ask a server manager to check the creator profile.",
    "Seul le membre Discord associé à ce créateur peut connecter son compte TikTok. Demandez à un responsable de vérifier le profil créateur.",
    "Solo el miembro de Discord vinculado a este creador puede conectar su cuenta de TikTok. Pide a un administrador que revise el perfil.",
    "Nur das mit diesem Creator verknüpfte Discord-Mitglied kann sein TikTok-Konto verbinden. Bitte einen Servermanager, das Creator-Profil zu prüfen.",
    "Somente o membro do Discord vinculado a este criador pode conectar sua conta do TikTok. Peça a um administrador para verificar o perfil."
  ],
  [
    "Cyro is not available in this server.",
    "Cyro n’est pas disponible dans ce serveur.",
    "Cyro no está disponible en este servidor.",
    "Cyro ist auf diesem Server nicht verfügbar.",
    "Cyro não está disponível neste servidor."
  ],
  [
    "You must still be a member of this server.",
    "Vous devez toujours être membre de ce serveur.",
    "Debes seguir siendo miembro de este servidor.",
    "Du musst weiterhin Mitglied dieses Servers sein.",
    "Você ainda precisa ser membro deste servidor."
  ],
  [
    "Invalid server.",
    "Serveur non valide.",
    "Servidor no válido.",
    "Ungültiger Server.",
    "Servidor inválido."
  ],
  [
    "The previous creator must disconnect this TikTok connection first. Contact Cyro support if they cannot access it.",
    "Le créateur précédent doit d’abord déconnecter ce compte TikTok. Contactez l’assistance Cyro s’il n’y a plus accès.",
    "El creador anterior debe desconectar primero esta conexión con TikTok. Contacta con soporte de Cyro si no puede acceder.",
    "Der vorherige Creator muss diese TikTok-Verbindung zuerst trennen. Wende dich an den Cyro-Support, wenn er keinen Zugriff mehr hat.",
    "O criador anterior deve desconectar esta conexão com o TikTok primeiro. Fale com o suporte do Cyro se ele não puder acessá-la."
  ],
  [
    "TikTok login is awaiting the app credentials and sandbox setup.",
    "La connexion TikTok attend la configuration des identifiants de l’application et du bac à sable.",
    "El inicio de sesión con TikTok requiere configurar las credenciales de la aplicación y el entorno de pruebas.",
    "Die TikTok-Anmeldung wartet auf App-Zugangsdaten und Sandbox-Einrichtung.",
    "O login com o TikTok aguarda as credenciais do aplicativo e a configuração do sandbox."
  ],
  [
    "Too many pending connections. Try again shortly.",
    "Trop de connexions en attente. Réessayez dans un instant.",
    "Hay demasiadas conexiones pendientes. Inténtalo en unos momentos.",
    "Zu viele ausstehende Verbindungen. Versuche es gleich erneut.",
    "Há muitas conexões pendentes. Tente novamente em instantes."
  ],
  [
    "TikTok connection did not match this browser. Start again from Creator connections.",
    "La connexion TikTok ne correspond pas à ce navigateur. Recommencez depuis les connexions créateur.",
    "La conexión con TikTok no coincide con este navegador. Empieza de nuevo desde Conexiones de creador.",
    "Die TikTok-Verbindung passt nicht zu diesem Browser. Starte erneut unter Creator-Verbindungen.",
    "A conexão com o TikTok não corresponde a este navegador. Recomece em Conexões do criador."
  ],
  [
    "TikTok connection expired. Start again from Creator connections.",
    "La connexion TikTok a expiré. Recommencez depuis les connexions créateur.",
    "La conexión con TikTok expiró. Empieza de nuevo desde Conexiones de creador.",
    "Die TikTok-Verbindung ist abgelaufen. Starte erneut unter Creator-Verbindungen.",
    "A conexão com o TikTok expirou. Recomece em Conexões do criador."
  ],
  [
    "TikTok returned an invalid code.",
    "TikTok a renvoyé un code non valide.",
    "TikTok devolvió un código no válido.",
    "TikTok hat einen ungültigen Code zurückgegeben.",
    "O TikTok retornou um código inválido."
  ],
  [
    "Only the creator who connected this TikTok account can disconnect it.",
    "Seul le créateur ayant connecté ce compte TikTok peut le déconnecter.",
    "Solo el creador que conectó esta cuenta de TikTok puede desconectarla.",
    "Nur der Creator, der dieses TikTok-Konto verbunden hat, kann es trennen.",
    "Somente o criador que conectou esta conta do TikTok pode desconectá-la."
  ],
  [
    "This server already has 100 creator profiles. Choose an existing profile or remove an empty one.",
    "Ce serveur possède déjà 100 profils créateur. Choisissez un profil existant ou supprimez un profil vide.",
    "Este servidor ya tiene 100 perfiles de creador. Elige uno existente o elimina uno vacío.",
    "Dieser Server hat bereits 100 Creator-Profile. Wähle ein vorhandenes Profil oder entferne ein leeres.",
    "Este servidor já tem 100 perfis de criador. Escolha um existente ou remova um vazio."
  ],
  [
    "Creator identity is immutable; unsupported profile field.",
    "L’identité du créateur est fixe ; champ de profil non pris en charge.",
    "La identidad del creador no se puede cambiar; campo de perfil no admitido.",
    "Die Creator-Identität ist unveränderlich; nicht unterstütztes Profilfeld.",
    "A identidade do criador é imutável; campo de perfil não suportado."
  ],
  [
    "Remove or move this creator’s configured accounts before deleting the profile.",
    "Supprimez ou déplacez les comptes configurés de ce créateur avant de supprimer le profil.",
    "Elimina o mueve las cuentas configuradas de este creador antes de borrar el perfil.",
    "Entferne oder verschiebe die Konten dieses Creators, bevor du das Profil löschst.",
    "Remova ou mova as contas configuradas deste criador antes de excluir o perfil."
  ],
  [
    "Streamer ID already exists or has retained history.",
    "L’identifiant du streamer existe déjà ou possède un historique conservé.",
    "El ID del streamer ya existe o tiene historial guardado.",
    "Die Streamer-ID existiert bereits oder hat gespeicherte Historie.",
    "O ID do streamer já existe ou tem histórico salvo."
  ],
  [
    "Streamer identity and guild are immutable.",
    "L’identité du streamer et son serveur ne peuvent pas être modifiés.",
    "La identidad del streamer y su servidor no se pueden cambiar.",
    "Streamer-Identität und Server sind unveränderlich.",
    "A identidade do streamer e o servidor não podem ser alterados."
  ],
  [
    "Creator name is derived and read-only; edit the creator profile.",
    "Le nom du créateur est dérivé et en lecture seule ; modifiez le profil créateur.",
    "El nombre del creador se obtiene del perfil y es de solo lectura; edita el perfil del creador.",
    "Der Creator-Name wird abgeleitet und ist schreibgeschützt; bearbeite das Creator-Profil.",
    "O nome do criador é derivado e somente leitura; edite o perfil do criador."
  ],
  [
    "TikTok LIVE uses a best-effort unofficial connector. TikTok changes or host blocking can interrupt checks; an Euler API key may improve reliability.",
    "TikTok LIVE utilise un connecteur non officiel sans garantie. Des changements TikTok ou un blocage de l’hébergeur peuvent interrompre les vérifications ; une clé API Euler peut améliorer la fiabilité.",
    "TikTok LIVE usa un conector no oficial sin garantías. Los cambios de TikTok o bloqueos del alojamiento pueden interrumpir las consultas; una clave API de Euler puede mejorar la fiabilidad.",
    "TikTok LIVE nutzt einen inoffiziellen Connector ohne Garantie. TikTok-Änderungen oder Host-Sperren können Prüfungen unterbrechen; ein Euler-API-Schlüssel kann die Zuverlässigkeit verbessern.",
    "O TikTok LIVE usa um conector não oficial sem garantia. Mudanças no TikTok ou bloqueios da hospedagem podem interromper as verificações; uma chave de API Euler pode melhorar a confiabilidade."
  ],
  [
    "YouTube LIVE uses the official Data API. New broadcast discovery is paced at 15 minutes per tracked YouTube channel across the bot.",
    "YouTube LIVE utilise l’API Data officielle. Les nouveaux directs sont recherchés toutes les 15 minutes par chaîne YouTube suivie dans le bot.",
    "YouTube LIVE usa la API Data oficial. Los nuevos directos se buscan cada 15 minutos por canal de YouTube seguido en todo el bot.",
    "YouTube LIVE nutzt die offizielle Data API. Neue Übertragungen werden botweit alle 15 Minuten pro verfolgtem YouTube-Kanal gesucht.",
    "O YouTube LIVE usa a Data API oficial. Novas transmissões são buscadas a cada 15 minutos por canal do YouTube monitorado no bot."
  ],
  [
    "Live alerts are configured.",
    "Les alertes de direct sont configurées.",
    "Los avisos de directos están configurados.",
    "Live-Benachrichtigungen sind eingerichtet.",
    "Os alertas de ao vivo estão configurados."
  ],
  [
    "New public YouTube videos and Shorts are checked about every 5 minutes (slower above 10 unique channels). Live broadcasts and replays are excluded.",
    "Les nouvelles vidéos et Shorts publics YouTube sont vérifiés environ toutes les 5 minutes, moins souvent au-delà de 10 chaînes distinctes. Les directs et rediffusions sont exclus.",
    "Los videos públicos y Shorts nuevos de YouTube se consultan cada 5 minutos aproximadamente, con menor frecuencia al superar 10 canales distintos. Se excluyen los directos y sus repeticiones.",
    "Neue öffentliche YouTube-Videos und Shorts werden etwa alle 5 Minuten geprüft, bei mehr als 10 verschiedenen Kanälen seltener. Livestreams und Wiederholungen sind ausgeschlossen.",
    "Novos vídeos públicos e Shorts do YouTube são verificados a cada 5 minutos aproximadamente, com menor frequência acima de 10 canais distintos. Transmissões ao vivo e reprises são excluídas."
  ],
  [
    "TikTok upload alerts require creator OAuth with Login Kit and video.list.",
    "Les alertes de vidéos TikTok nécessitent l’autorisation OAuth du créateur avec Login Kit et video.list.",
    "Los avisos de videos de TikTok requieren OAuth del creador con Login Kit y video.list.",
    "TikTok-Video-Benachrichtigungen benötigen Creator-OAuth mit Login Kit und video.list.",
    "Os alertas de vídeos do TikTok exigem OAuth do criador com Login Kit e video.list."
  ],
  [
    "Automatic uploaded-video alerts are available for YouTube and connected TikTok creators.",
    "Les alertes automatiques de vidéos sont disponibles pour YouTube et les créateurs TikTok connectés.",
    "Los avisos automáticos de videos están disponibles para YouTube y creadores de TikTok conectados.",
    "Automatische Video-Benachrichtigungen sind für YouTube und verbundene TikTok-Creator verfügbar.",
    "Os alertas automáticos de vídeos estão disponíveis para o YouTube e criadores conectados do TikTok."
  ]
];

/** Trusted dashboard-owned copy only; values and user-written content are never catalog keys. */
export const DASHBOARD_ERROR_ROWS: ReadonlyArray<readonly [string,string,string,string,string]> = [
  [
    "The request could not be completed. Check the bot log and try again.",
    "La requête a échoué. Consultez le journal du bot et réessayez.",
    "No se pudo completar la solicitud. Revisa el registro del bot e inténtalo de nuevo.",
    "Die Anfrage konnte nicht abgeschlossen werden. Prüfe das Bot-Protokoll und versuche es erneut.",
    "Não foi possível concluir a solicitação. Confira o registro do bot e tente novamente."
  ],
  [
    "The request timed out. Reload the server state before trying again.",
    "La requête a expiré. Rechargez l’état du serveur avant de réessayer.",
    "La solicitud agotó el tiempo de espera. Recarga el estado del servidor antes de intentarlo de nuevo.",
    "Zeitüberschreitung. Lade den Serverstatus vor einem weiteren Versuch neu.",
    "A solicitação expirou. Recarregue o estado do servidor antes de tentar novamente."
  ],
  [
    "Too many pending sign-ins. Please try again shortly.",
    "Trop de connexions en attente. Réessayez dans un instant.",
    "Hay demasiados inicios de sesión pendientes. Inténtalo en unos momentos.",
    "Zu viele ausstehende Anmeldungen. Versuche es gleich erneut.",
    "Há muitos logins pendentes. Tente novamente em instantes."
  ],
  [
    "Dashboard is busy. Please try again shortly.",
    "Le tableau de bord est occupé. Réessayez dans un instant.",
    "El panel está ocupado. Inténtalo en unos momentos.",
    "Das Dashboard ist ausgelastet. Versuche es gleich erneut.",
    "O painel está ocupado. Tente novamente em instantes."
  ],
  [
    "Dashboard is busy. Try again shortly.",
    "Le tableau de bord est occupé. Réessayez dans un instant.",
    "El panel está ocupado. Inténtalo en unos momentos.",
    "Das Dashboard ist ausgelastet. Versuche es gleich erneut.",
    "O painel está ocupado. Tente novamente em instantes."
  ],
  [
    "Expected creator settings.",
    "Des paramètres de créateur sont attendus.",
    "Se esperaban ajustes del creador.",
    "Creator-Einstellungen erwartet.",
    "Eram esperadas configurações do criador."
  ],
  [
    "Unknown creator setting.",
    "Paramètre de créateur inconnu.",
    "Ajuste del creador desconocido.",
    "Unbekannte Creator-Einstellung.",
    "Configuração de criador desconhecida."
  ],
  [
    "Creator name must be 1 to 80 characters without control characters.",
    "Le nom du créateur doit contenir de 1 à 80 caractères, sans caractères de contrôle.",
    "El nombre del creador debe tener entre 1 y 80 caracteres, sin caracteres de control.",
    "Der Creator-Name muss 1–80 Zeichen ohne Steuerzeichen enthalten.",
    "O nome do criador deve ter de 1 a 80 caracteres, sem caracteres de controle."
  ],
  [
    "Creator name must contain 1 to 80 characters without control characters.",
    "Le nom du créateur doit contenir de 1 à 80 caractères, sans caractères de contrôle.",
    "El nombre del creador debe tener entre 1 y 80 caracteres, sin caracteres de control.",
    "Der Creator-Name muss 1–80 Zeichen ohne Steuerzeichen enthalten.",
    "O nome do criador deve ter de 1 a 80 caracteres, sem caracteres de controle."
  ],
  [
    "Choose a valid Discord member ID, or clear it.",
    "Choisissez un identifiant de membre Discord valide ou effacez-le.",
    "Elige un ID de miembro de Discord válido o bórralo.",
    "Wähle eine gültige Discord-Mitglieds-ID oder leere das Feld.",
    "Escolha um ID válido de membro do Discord ou limpe o campo."
  ],
  [
    "The creator’s Discord member must belong to this server.",
    "Le membre Discord du créateur doit appartenir à ce serveur.",
    "El miembro de Discord del creador debe pertenecer a este servidor.",
    "Das Discord-Mitglied des Creators muss diesem Server angehören.",
    "O membro do Discord do criador deve pertencer a este servidor."
  ],
  [
    "Discord authentication request deadline exceeded. Please try again shortly.",
    "La demande d’authentification Discord a expiré. Réessayez dans un instant.",
    "La solicitud de autenticación de Discord agotó el tiempo de espera. Inténtalo en unos momentos.",
    "Die Discord-Authentifizierung hat zu lange gedauert. Versuche es gleich erneut.",
    "A solicitação de autenticação do Discord expirou. Tente novamente em instantes."
  ],
  [
    "This is an offline dashboard preview.",
    "Il s’agit d’un aperçu hors ligne du tableau de bord.",
    "Esta es una vista previa sin conexión del panel.",
    "Dies ist eine Offline-Vorschau des Dashboards.",
    "Esta é uma prévia offline do painel."
  ],
  [
    "The bot is not installed in this server.",
    "Le bot n’est pas installé sur ce serveur.",
    "El bot no está instalado en este servidor.",
    "Der Bot ist auf diesem Server nicht installiert.",
    "O bot não está instalado neste servidor."
  ],
  [
    "You must be a member with Manage Server permission.",
    "Vous devez être membre et avoir la permission Gérer le serveur.",
    "Debes ser miembro y tener el permiso Gestionar servidor.",
    "Du musst Mitglied sein und die Berechtigung Server verwalten haben.",
    "Você deve ser membro e ter a permissão Gerenciar servidor."
  ],
  [
    "The request is no longer active.",
    "La requête n’est plus active.",
    "La solicitud ya no está activa.",
    "Die Anfrage ist nicht mehr aktiv.",
    "A solicitação não está mais ativa."
  ],
  [
    "Send JSON with Content-Type: application/json.",
    "Envoyez du JSON avec Content-Type: application/json.",
    "Envía JSON con Content-Type: application/json.",
    "Sende JSON mit Content-Type: application/json.",
    "Envie JSON com Content-Type: application/json."
  ],
  [
    "Request is too large.",
    "La requête est trop volumineuse.",
    "La solicitud es demasiado grande.",
    "Die Anfrage ist zu groß.",
    "A solicitação é grande demais."
  ],
  [
    "Invalid JSON.",
    "JSON non valide.",
    "JSON no válido.",
    "Ungültiges JSON.",
    "JSON inválido."
  ],
  [
    "Too many requests. Please wait before trying again.",
    "Trop de requêtes. Patientez avant de réessayer.",
    "Demasiadas solicitudes. Espera antes de intentarlo de nuevo.",
    "Zu viele Anfragen. Warte vor einem weiteren Versuch.",
    "Muitas solicitações. Aguarde antes de tentar novamente."
  ],
  [
    "The dashboard is shutting down. Please try again shortly.",
    "Le tableau de bord est en cours d’arrêt. Réessayez dans un instant.",
    "El panel se está cerrando. Inténtalo en unos momentos.",
    "Das Dashboard wird heruntergefahren. Versuche es gleich erneut.",
    "O painel está sendo desligado. Tente novamente em instantes."
  ],
  [
    "The bot owner must configure DISCORD_CLIENT_SECRET and DASHBOARD_URL to enable sign-in.",
    "Le propriétaire du bot doit configurer DISCORD_CLIENT_SECRET et DASHBOARD_URL pour activer la connexion.",
    "El propietario del bot debe configurar DISCORD_CLIENT_SECRET y DASHBOARD_URL para activar el inicio de sesión.",
    "Der Bot-Betreiber muss DISCORD_CLIENT_SECRET und DASHBOARD_URL konfigurieren, um die Anmeldung zu aktivieren.",
    "O dono do bot deve configurar DISCORD_CLIENT_SECRET e DASHBOARD_URL para ativar o login."
  ],
  [
    "Your sign-in expired or did not match this browser. Start sign-in again.",
    "Votre connexion a expiré ou ne correspond pas à ce navigateur. Recommencez la connexion.",
    "Tu inicio de sesión expiró o no coincide con este navegador. Vuelve a iniciarlo.",
    "Deine Anmeldung ist abgelaufen oder passt nicht zu diesem Browser. Melde dich erneut an.",
    "Seu login expirou ou não corresponde a este navegador. Faça login novamente."
  ],
  [
    "Discord sign-in was cancelled.",
    "La connexion Discord a été annulée.",
    "Se canceló el inicio de sesión con Discord.",
    "Die Discord-Anmeldung wurde abgebrochen.",
    "O login com o Discord foi cancelado."
  ],
  [
    "Discord did not return a valid login.",
    "Discord n’a pas renvoyé de connexion valide.",
    "Discord no devolvió un inicio de sesión válido.",
    "Discord hat keine gültige Anmeldung zurückgegeben.",
    "O Discord não retornou um login válido."
  ],
  [
    "Cyro is reconnecting.",
    "Cyro se reconnecte.",
    "Cyro se está reconectando.",
    "Cyro stellt die Verbindung wieder her.",
    "Cyro está se reconectando."
  ],
  [
    "Sign in again.",
    "Reconnectez-vous.",
    "Vuelve a iniciar sesión.",
    "Melde dich erneut an.",
    "Faça login novamente."
  ],
  [
    "TikTok is unavailable.",
    "TikTok est indisponible.",
    "TikTok no está disponible.",
    "TikTok ist nicht verfügbar.",
    "O TikTok está indisponível."
  ],
  [
    "Sign in with Discord to continue.",
    "Connectez-vous avec Discord pour continuer.",
    "Inicia sesión con Discord para continuar.",
    "Melde dich mit Discord an, um fortzufahren.",
    "Entre com o Discord para continuar."
  ],
  [
    "The security token is missing or expired. Refresh and try again.",
    "Le jeton de sécurité est manquant ou a expiré. Actualisez la page et réessayez.",
    "El token de seguridad falta o expiró. Actualiza la página e inténtalo de nuevo.",
    "Das Sicherheitstoken fehlt oder ist abgelaufen. Lade die Seite neu und versuche es erneut.",
    "O token de segurança está ausente ou expirou. Atualize a página e tente novamente."
  ],
  [
    "The bot is starting up or reconnecting. Please try again shortly.",
    "Le bot démarre ou se reconnecte. Réessayez dans un instant.",
    "El bot se está iniciando o reconectando. Inténtalo en unos momentos.",
    "Der Bot startet oder verbindet sich erneut. Versuche es gleich erneut.",
    "O bot está iniciando ou se reconectando. Tente novamente em instantes."
  ],
  [
    "TikTok connections are unavailable.",
    "Les connexions TikTok sont indisponibles.",
    "Las conexiones con TikTok no están disponibles.",
    "TikTok-Verbindungen sind nicht verfügbar.",
    "As conexões com o TikTok estão indisponíveis."
  ],
  [
    "Your session expired. Sign in again.",
    "Votre session a expiré. Reconnectez-vous.",
    "Tu sesión expiró. Vuelve a iniciar sesión.",
    "Deine Sitzung ist abgelaufen. Melde dich erneut an.",
    "Sua sessão expirou. Faça login novamente."
  ],
  [
    "TikTok could not complete this request. Check your connection and try again.",
    "TikTok n’a pas pu traiter cette requête. Vérifiez votre connexion et réessayez.",
    "TikTok no pudo completar esta solicitud. Revisa tu conexión e inténtalo de nuevo.",
    "TikTok konnte diese Anfrage nicht abschließen. Prüfe deine Verbindung und versuche es erneut.",
    "O TikTok não conseguiu concluir esta solicitação. Confira sua conexão e tente novamente."
  ],
  [
    "Endpoint not found.",
    "Point d’accès introuvable.",
    "Ruta no encontrada.",
    "Endpunkt nicht gefunden.",
    "Rota não encontrada."
  ],
  [
    "Language settings are not available.",
    "Les paramètres de langue sont indisponibles.",
    "Los ajustes de idioma no están disponibles.",
    "Spracheinstellungen sind nicht verfügbar.",
    "As configurações de idioma estão indisponíveis."
  ],
  [
    "Cyro is reconnecting. Reload before changing these settings.",
    "Cyro se reconnecte. Rechargez la page avant de modifier ces paramètres.",
    "Cyro se está reconectando. Recarga la página antes de cambiar estos ajustes.",
    "Cyro verbindet sich erneut. Lade die Seite neu, bevor du diese Einstellungen änderst.",
    "Cyro está se reconectando. Recarregue a página antes de alterar estas configurações."
  ],
  [
    "Use GET or PATCH for language settings.",
    "Utilisez GET ou PATCH pour les paramètres de langue.",
    "Usa GET o PATCH para los ajustes de idioma.",
    "Verwende GET oder PATCH für Spracheinstellungen.",
    "Use GET ou PATCH para as configurações de idioma."
  ],
  [
    "Community tools are not available.",
    "Les outils communautaires sont indisponibles.",
    "Las herramientas de comunidad no están disponibles.",
    "Community-Werkzeuge sind nicht verfügbar.",
    "As ferramentas da comunidade estão indisponíveis."
  ],
  [
    "Use GET or PATCH for settings, or POST to update a bug report status.",
    "Utilisez GET ou PATCH pour les paramètres, ou POST pour modifier l’état d’un signalement de bug.",
    "Usa GET o PATCH para los ajustes, o POST para actualizar el estado de un informe de error.",
    "Verwende GET oder PATCH für Einstellungen oder POST zum Aktualisieren eines Fehlerberichts.",
    "Use GET ou PATCH para configurações ou POST para atualizar o status de um relato de bug."
  ],
  [
    "Status roles are not available.",
    "Les rôles de statut sont indisponibles.",
    "Los roles por estado no están disponibles.",
    "Statusrollen sind nicht verfügbar.",
    "Os cargos por status estão indisponíveis."
  ],
  [
    "Cyro is reconnecting. Reload before changing status roles.",
    "Cyro se reconnecte. Rechargez la page avant de modifier les rôles de statut.",
    "Cyro se está reconectando. Recarga la página antes de cambiar los roles por estado.",
    "Cyro verbindet sich erneut. Lade die Seite neu, bevor du Statusrollen änderst.",
    "Cyro está se reconectando. Recarregue a página antes de alterar os cargos por status."
  ],
  [
    "Use GET or PATCH for status role settings.",
    "Utilisez GET ou PATCH pour les paramètres des rôles de statut.",
    "Usa GET o PATCH para los ajustes de roles por estado.",
    "Verwende GET oder PATCH für Statusrollen-Einstellungen.",
    "Use GET ou PATCH para as configurações de cargos por status."
  ],
  [
    "Suggestions are not available.",
    "Les suggestions sont indisponibles.",
    "Las sugerencias no están disponibles.",
    "Vorschläge sind nicht verfügbar.",
    "As sugestões estão indisponíveis."
  ],
  [
    "Choose a page from 1 to 100,000.",
    "Choisissez une page de 1 à 100 000.",
    "Elige una página entre 1 y 100.000.",
    "Wähle eine Seite von 1 bis 100.000.",
    "Escolha uma página de 1 a 100.000."
  ],
  [
    "Cyro is reconnecting. Reload before changing suggestions.",
    "Cyro se reconnecte. Rechargez la page avant de modifier les suggestions.",
    "Cyro se está reconectando. Recarga la página antes de cambiar las sugerencias.",
    "Cyro verbindet sich erneut. Lade die Seite neu, bevor du Vorschläge änderst.",
    "Cyro está se reconectando. Recarregue a página antes de alterar as sugestões."
  ],
  [
    "Use GET or PATCH for suggestions settings, or POST to review a suggestion.",
    "Utilisez GET ou PATCH pour les paramètres des suggestions, ou POST pour examiner une suggestion.",
    "Usa GET o PATCH para los ajustes de sugerencias, o POST para revisar una sugerencia.",
    "Verwende GET oder PATCH für Vorschlagseinstellungen oder POST zum Prüfen eines Vorschlags.",
    "Use GET ou PATCH para as configurações de sugestões ou POST para avaliar uma sugestão."
  ],
  [
    "Cyro is reconnecting. Reload before changing the profile.",
    "Cyro se reconnecte. Rechargez la page avant de modifier le profil.",
    "Cyro se está reconectando. Recarga la página antes de cambiar el perfil.",
    "Cyro verbindet sich erneut. Lade die Seite neu, bevor du das Profil änderst.",
    "Cyro está se reconectando. Recarregue a página antes de alterar o perfil."
  ],
  [
    "Use GET or PATCH for the server profile.",
    "Utilisez GET ou PATCH pour le profil du serveur.",
    "Usa GET o PATCH para el perfil del servidor.",
    "Verwende GET oder PATCH für das Serverprofil.",
    "Use GET ou PATCH para o perfil do servidor."
  ],
  [
    "Access settings unavailable.",
    "Les paramètres d’accès sont indisponibles.",
    "Los ajustes de acceso no están disponibles.",
    "Zugriffseinstellungen sind nicht verfügbar.",
    "As configurações de acesso estão indisponíveis."
  ],
  [
    "Cyro is reconnecting. Reload before changing access settings.",
    "Cyro se reconnecte. Rechargez la page avant de modifier les paramètres d’accès.",
    "Cyro se está reconectando. Recarga la página antes de cambiar los ajustes de acceso.",
    "Cyro verbindet sich erneut. Lade die Seite neu, bevor du Zugriffseinstellungen änderst.",
    "Cyro está se reconectando. Recarregue a página antes de alterar as configurações de acesso."
  ],
  [
    "Only the server owner can change access settings.",
    "Seul le propriétaire du serveur peut modifier les paramètres d’accès.",
    "Solo el propietario del servidor puede cambiar los ajustes de acceso.",
    "Nur der Serverinhaber kann Zugriffseinstellungen ändern.",
    "Somente o dono do servidor pode alterar as configurações de acesso."
  ],
  [
    "Only the current server owner can change access settings.",
    "Seul le propriétaire actuel du serveur peut modifier les paramètres d’accès.",
    "Solo el propietario actual del servidor puede cambiar los ajustes de acceso.",
    "Nur der aktuelle Serverinhaber kann Zugriffseinstellungen ändern.",
    "Somente o atual dono do servidor pode alterar as configurações de acesso."
  ],
  [
    "An automatic role is selected for access. Remove its automatic assignment first.",
    "Un rôle automatique est sélectionné pour l’accès. Supprimez d’abord son attribution automatique.",
    "Se seleccionó un rol automático para el acceso. Elimina primero su asignación automática.",
    "Eine automatische Rolle wurde für den Zugriff gewählt. Entferne zuerst ihre automatische Zuweisung.",
    "Um cargo automático foi selecionado para acesso. Remova primeiro sua atribuição automática."
  ],
  [
    "An automatic, verification, self, or application role is selected for access. Remove that assignment first.",
    "Un rôle automatique, de vérification, libre-service ou de candidature est sélectionné pour l’accès. Supprimez d’abord cette attribution.",
    "Se seleccionó un rol automático, de verificación, autoservicio o solicitud para el acceso. Elimina primero esa asignación.",
    "Eine automatische, Verifizierungs-, Selbstwahl- oder Bewerbungsrolle wurde für den Zugriff gewählt. Entferne zuerst diese Zuweisung.",
    "Um cargo automático, de verificação, autoatribuível ou de candidatura foi selecionado para acesso. Remova primeiro essa atribuição."
  ],
  [
    "Publishing is unavailable.",
    "La publication est indisponible.",
    "La publicación no está disponible.",
    "Veröffentlichen ist nicht verfügbar.",
    "A publicação está indisponível."
  ],
  [
    "Support panels are not available.",
    "Les panneaux d’assistance sont indisponibles.",
    "Los paneles de soporte no están disponibles.",
    "Support-Panels sind nicht verfügbar.",
    "Os painéis de suporte estão indisponíveis."
  ],
  [
    "Verification panels are not available.",
    "Les panneaux de vérification sont indisponibles.",
    "Los paneles de verificación no están disponibles.",
    "Verifizierungs-Panels sind nicht verfügbar.",
    "Os painéis de verificação estão indisponíveis."
  ],
  [
    "Verification uses the saved settings. Save them before publishing.",
    "La vérification utilise les paramètres enregistrés. Enregistrez-les avant de publier.",
    "La verificación usa los ajustes guardados. Guárdalos antes de publicar.",
    "Die Verifizierung nutzt die gespeicherten Einstellungen. Speichere sie vor dem Veröffentlichen.",
    "A verificação usa as configurações salvas. Salve-as antes de publicar."
  ],
  [
    "Streamer statistics are not available.",
    "Les statistiques des streamers sont indisponibles.",
    "Las estadísticas de streamers no están disponibles.",
    "Streamer-Statistiken sind nicht verfügbar.",
    "As estatísticas dos streamers estão indisponíveis."
  ],
  [
    "Creator profiles are not available.",
    "Les profils de créateurs sont indisponibles.",
    "Los perfiles de creadores no están disponibles.",
    "Creator-Profile sind nicht verfügbar.",
    "Os perfis de criadores estão indisponíveis."
  ],
  [
    "Method not allowed.",
    "Méthode non autorisée.",
    "Método no permitido.",
    "Methode nicht erlaubt.",
    "Método não permitido."
  ],
  [
    "Page not found.",
    "Page introuvable.",
    "Página no encontrada.",
    "Seite nicht gefunden.",
    "Página não encontrada."
  ],
  [
    "Dashboard file not found.",
    "Fichier du tableau de bord introuvable.",
    "Archivo del panel no encontrado.",
    "Dashboard-Datei nicht gefunden.",
    "Arquivo do painel não encontrado."
  ]
];

type Row = readonly [string,string,string,string,string];
const FIELD_LABELS: Row[] = [["Community settings","Paramètres communautaires","Ajustes de comunidad","Community-Einstellungen","Configurações da comunidade"],["Counting","Comptage","Conteo","Zählen","Contagem"],["Welcome","Accueil","Bienvenida","Willkommen","Boas-vindas"],["Member card","Carte de membre","Tarjeta de miembro","Mitgliederkarte","Cartão de membro"],["Self roles","Rôles en libre-service","Roles de autoservicio","Selbstwahlrollen","Cargos autoatribuíveis"],["Self role","Rôle en libre-service","Rol de autoservicio","Selbstwahlrolle","Cargo autoatribuível"],["Invites","Invitations","Invitaciones","Einladungen","Convites"],["Levels","Niveaux","Niveles","Level","Níveis"],["Verification","Vérification","Verificación","Verifizierung","Verificação"],["Channel","Salon","Canal","Kanal","Canal"],["Role","Rôle","Rol","Rolle","Cargo"],["Verification role","Rôle de vérification","Rol de verificación","Verifizierungsrolle","Cargo de verificação"],["Counting enabled","Comptage activé","Conteo activado","Zählen aktiviert","Contagem ativada"],["Welcome enabled","Accueil activé","Bienvenida activada","Willkommen aktiviert","Boas-vindas ativadas"],["Invites enabled","Invitations activées","Invitaciones activadas","Einladungen aktiviert","Convites ativados"],["Invite logging enabled","Journal d’invitations activé","Registro de invitaciones activado","Einladungsprotokoll aktiviert","Registro de convites ativado"],["Levels enabled","Niveaux activés","Niveles activados","Level aktiviert","Níveis ativados"],["Verification enabled","Vérification activée","Verificación activada","Verifizierung aktiviert","Verificação ativada"],["showAvatar","Afficher l’avatar","Mostrar avatar","Avatar anzeigen","Mostrar avatar"],["showDivider","Afficher le séparateur","Mostrar separador","Trennlinie anzeigen","Mostrar separador"],["decoration","Décoration","Decoración","Dekoration","Decoração"],["Welcome message","Message d’accueil","Mensaje de bienvenida","Willkommensnachricht","Mensagem de boas-vindas"],["Goodbye message","Message de départ","Mensaje de despedida","Abschiedsnachricht","Mensagem de despedida"],["Card text","Texte de la carte","Texto de la tarjeta","Kartentext","Texto do cartão"],["Role label","Libellé du rôle","Etiqueta del rol","Rollenbeschriftung","Rótulo do cargo"],["Challenge name","Nom du défi","Nombre del desafío","Challenge-Name","Nome do desafio"],["Verification title","Titre de vérification","Título de verificación","Verifizierungstitel","Título de verificação"],["Verification message","Message de vérification","Mensaje de verificación","Verifizierungsnachricht","Mensagem de verificação"],["Ticket type name","Nom du type de ticket","Nombre del tipo de ticket","Tickettypname","Nome do tipo de ticket"],["Application form name","Nom du formulaire de candidature","Nombre del formulario de solicitud","Bewerbungsformularname","Nome do formulário de candidatura"],["Application question","Question de candidature","Pregunta de solicitud","Bewerbungsfrage","Pergunta de candidatura"],["Panel name","Nom du panneau","Nombre del panel","Panelname","Nome do painel"],["Panel title","Titre du panneau","Título del panel","Paneltitel","Título do painel"],["Panel description","Description du panneau","Descripción del panel","Panelbeschreibung","Descrição do painel"],["Option label","Libellé de l’option","Etiqueta de opción","Optionsbeschriftung","Rótulo da opção"],["Ticket types","Types de tickets","Tipos de tickets","Tickettypen","Tipos de tickets"],["Application forms","Formulaires de candidature","Formularios de solicitud","Bewerbungsformulare","Formulários de candidatura"],["Support panels","Panneaux d’assistance","Paneles de soporte","Support-Panels","Painéis de suporte"],["Message","Message","Mensaje","Nachricht","Mensagem"],["Title","Titre","Título","Titel","Título"],["Description","Description","Descripción","Beschreibung","Descrição"],["Footer","Pied de page","Pie de página","Fußzeile","Rodapé"],["Author","Auteur","Autor","Autor","Autor"],["Field name","Nom du champ","Nombre del campo","Feldname","Nome do campo"],["Field value","Valeur du champ","Valor del campo","Feldwert","Valor do campo"],["Poll question","Question du sondage","Pregunta de la encuesta","Umfragefrage","Pergunta da enquete"],["Answer","Réponse","Respuesta","Antwort","Resposta"],["URL","URL","URL","URL","URL"],["channelId","Salon","Canal","Kanal","Canal"],["pingRoleId","Rôle de mention","Rol de mención","Erwähnungsrolle","Cargo de menção"],["liveRoleId","Rôle de direct","Rol de directo","Live-Rolle","Cargo de ao vivo"],["discordMemberId","Membre Discord","Miembro de Discord","Discord-Mitglied","Membro do Discord"],["messageTemplate","Modèle de message","Plantilla de mensaje","Nachrichtenvorlage","Modelo de mensagem"],["titleFilter","Filtre de titre","Filtro de título","Titelfilter","Filtro de título"]];
/** Expand the finite validator vocabulary. Unknown user-supplied labels never become trusted copy. */
function validationRows(): Row[] {
  const rows: Row[]=[];
  const field=(name:string):Row=>FIELD_LABELS.find(row=>row[0]===name)!;
  const add=(key:string, labels:Row, template:readonly string[], params:Record<string,string|number>={})=>{
    rows.push([key,...template.map((text,i)=>text.replace(/\{(field|min|max)\}/g,(_,name:string)=>name==='field'?labels[i+1]!:String(params[name])))] as [string,string,string,string,string]);
  };
  for(const name of ['Community settings','Counting','Welcome','Member card','Self roles','Self role','Invites','Levels','Verification'])
    add(name+' must be an object.',field(name),['{field} : un objet est requis.','{field}: debe ser un objeto.','{field}: muss ein Objekt sein.','{field}: deve ser um objeto.']);
  for(const [name,label] of [['community','Community settings'],['counting','Counting'],['welcome','Welcome'],['member card','Member card'],['self roles','Self roles'],['self role','Self role'],['invites','Invites'],['levels','Levels'],['verification','Verification']])
    add('Unknown '+name+' setting.',field(label!),['{field} : paramètre inconnu.','{field}: ajuste desconocido.','{field}: unbekannte Einstellung.','{field}: configuração desconhecida.']);
  for(const name of ['Counting enabled','Welcome enabled','Invites enabled','Invite logging enabled','Levels enabled','Verification enabled','showAvatar','showDivider','decoration'])
    add(name+' must be true or false.',field(name),['{field} : indiquez vrai ou faux.','{field}: indica verdadero o falso.','{field}: muss wahr oder falsch sein.','{field}: informe verdadeiro ou falso.']);
  FIELD_LABELS.push(['alertChannelId','Salon d’annonces','Canal de anuncios','Ankündigungskanal','Canal de anúncios']);
  for(const name of ['Channel','Role','Verification role','channelId','alertChannelId','pingRoleId','liveRoleId','discordMemberId'])
    add(name+' must be a Discord ID.',field(name),['{field} : identifiant Discord requis.','{field}: se requiere un ID de Discord.','{field}: eine Discord-ID ist erforderlich.','{field}: é necessário um ID do Discord.']);
  const limits:[string,number,number][]=[['Channel',17,20],['Role',17,20],['Verification role',17,20],['Welcome message',1,1000],['Goodbye message',0,1000],['Card text',0,24],['Card text',0,120],['Role label',1,80],['Challenge name',1,80],['Verification title',1,100],['Verification message',1,1500]];
  const templates=['{field} : entre {min} et {max} caractères.','{field}: entre {min} y {max} caracteres.','{field}: zwischen {min} und {max} Zeichen.','{field}: entre {min} e {max} caracteres.'];
  for(const [name,min,max] of limits)add(name+' must contain '+min+' to '+max+' characters.',field(name),templates,{min,max});
  for(const [name,min,max] of [['URL',0,2000],['Message',0,2000],['Title',0,256],['Description',0,4096],['Footer',0,2048],['Author',0,256],['Field name',1,256],['Field value',1,1024],['Poll question',1,300],['Answer',1,55]] as [string,number,number][])
    add(name+' must contain '+min+'–'+max+' characters.',field(name),templates,{min,max});
  for(const [name,max] of [['Ticket type name',80],['Application form name',80],['Application question',100],['Panel name',80],['Panel title',256],['Option label',80]] as [string,number][])
    add(name+' must be 1–'+max+' characters.',field(name),templates,{min:1,max});
  add('Panel description must be at most2000 characters.',field('Panel description'),templates,{min:0,max:2000});
  for(const [name,max] of [['messageTemplate',1800],['titleFilter',100]] as [string,number][])for(const prefix of ['', 'Upload '])
    add(prefix+name+' must be text up to '+max+' characters.',field(name),templates,{min:0,max});
  for(const name of ['Ticket types','Application forms','Support panels']){
    add(name+' supports up to 25 entries.',field(name),['{field} : 25 éléments maximum.','{field}: hasta 25 elementos.','{field}: bis zu 25 Einträge.','{field}: até 25 itens.']);
    add(name+' IDs must be unique.',field(name),['{field} : les identifiants doivent être distincts.','{field}: los IDs deben ser distintos.','{field}: IDs müssen eindeutig sein.','{field}: os IDs devem ser distintos.']);
  }
  return rows;
}

/** Publish checks report only the missing entries from this fixed permission set. */
function publishingPermissionRows(): Row[] {
  const names: Row[] = [
    ['View Channel', 'Voir le salon', 'Ver canal', 'Kanal ansehen', 'Ver canal'],
    ['Send Messages', 'Envoyer des messages', 'Enviar mensajes', 'Nachrichten senden', 'Enviar mensagens'],
    ['Send Polls', 'Envoyer des sondages', 'Enviar encuestas', 'Umfragen senden', 'Enviar enquetes'],
    ['Embed Links', 'Intégrer des liens', 'Insertar enlaces', 'Links einbetten', 'Inserir links'],
  ];
  const rows: Row[] = [];
  for (let mask = 1; mask < (1 << names.length); mask++) {
    const selected = names.filter((_, index) => mask & (1 << index));
    const list = (locale: number) => selected.map(row => row[locale]).join(', ');
    rows.push([
      `Cyro is missing these permissions in this channel: ${list(0)}. Ask a server admin to check Cyro’s role and this channel’s permissions.`,
      `Il manque ces permissions à Cyro dans ce salon : ${list(1)}. Demandez à un administrateur de vérifier le rôle de Cyro et les permissions de ce salon.`,
      `A Cyro le faltan estos permisos en este canal: ${list(2)}. Pide a un administrador que revise el rol de Cyro y los permisos de este canal.`,
      `Cyro fehlen in diesem Kanal diese Berechtigungen: ${list(3)}. Bitte einen Serveradministrator, Cyros Rolle und die Kanalberechtigungen zu prüfen.`,
      `Faltam estas permissões ao Cyro neste canal: ${list(4)}. Peça a um administrador para verificar o cargo do Cyro e as permissões deste canal.`,
    ]);
  }
  return rows;
}

export const ALL_DASHBOARD_ERROR_ROWS: readonly Row[]=[
  ...CUSTOM_COMMAND_MESSAGE_ROWS,
  ...Object.entries(BOT_TRANSLATIONS).map(([en,value])=>[en,value.fr,value.es,value.de,value.pt] as Row),
  ...DASHBOARD_ERROR_ROWS,...STREAM_ERROR_ROWS,...COMMUNITY_ERROR_ROWS,...CONTROL_ERROR_ROWS,...CONNECTION_ERROR_ROWS,...validationRows(),...publishingPermissionRows(),
];
export const DASHBOARD_TRANSLATIONS: Readonly<Record<string,{fr:string;es:string;de:string;pt:string}>>=Object.fromEntries(
  ALL_DASHBOARD_ERROR_ROWS.map(([en,fr,es,de,pt])=>[en,{fr,es,de,pt}])
);
export const GENERIC_DASHBOARD_ERROR='The request could not be completed. Check the bot log and try again.';
export interface DashboardErrorPayload {error:string;i18n:{key:string;params:TextParams}}
const interpolate=(key:string,params:TextParams)=>key.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(token,name:string)=>Object.hasOwn(params,name)?String(params[name]):token);
const payload=(key:string,params:TextParams={}):DashboardErrorPayload=>({error:interpolate(key,params),i18n:{key,params}});

/** Only catalogue entries or explicitly structured, known errors may reach the browser. */
export function dashboardError(error:unknown):DashboardErrorPayload {
  if(error instanceof BotMessageError&&Object.hasOwn(DASHBOARD_TRANSLATIONS,error.sourceEnglish))return payload(error.sourceEnglish,error.params);
  const message=error instanceof Error?error.message:typeof error==='string'?error:'';
  if(Object.hasOwn(DASHBOARD_TRANSLATIONS,message))return payload(message);
  // Some Discord-facing helpers throw a fixed message already translated for the server.
  for(const [key,translations] of Object.entries(DASHBOARD_TRANSLATIONS))if(Object.values(translations).includes(message))return payload(key);
  // Only these finite, developer-owned numeric forms are recoverable from older validators.
  const numeric=/^Numeric setting must be between (3|1) and (30|60|1440|5)\.$/.exec(message);
  if(numeric&&['3:30','3:60','1:1440','1:5'].includes(numeric[1]+':'+numeric[2]))return payload('Numeric setting must be between {min} and {max}.',{min:Number(numeric[1]),max:Number(numeric[2])});
  const auth=/^Discord authentication service returned ([45]\d{2})\. Please sign in again or try shortly\.$/.exec(message);
  if(auth)return payload('Discord authentication service returned {status}. Please sign in again or try shortly.',{status:Number(auth[1])});
  // The suffix is an untrusted request field; deliberately never return it.
  if(/^Unknown (?:stream )?setting: /.test(message))return payload('Unknown setting.');
  return payload(GENERIC_DASHBOARD_ERROR);
}

/** Public, non-sensitive translation catalogue; contains no server state or credentials. */
export function dashboardErrorScript():string {
  const catalog=Object.fromEntries(['fr','es','de','pt'].map((locale,index)=>[locale,Object.fromEntries(ALL_DASHBOARD_ERROR_ROWS.map(row=>[row[0],row[index+1]]))]));
  return "'use strict';\n(window.CyroDashboardCatalogs ||= []).push("+JSON.stringify(catalog).replace(/</g,'\\u003c')+");\n";
}

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
/** Navigation failures use the browser's saved language without exposing login codes or URLs. */
export function dashboardErrorPage(error:unknown):string {
  const value=dashboardError(error);
  return '<!doctype html><html lang="en" translate="no"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1"><title data-i18n>We couldn’t complete that request.</title><link rel="stylesheet" href="/auth-error.css"><script src="/i18n-catalogs.js" defer></script><script src="/i18n-extra-catalogs.js" defer></script><script src="/i18n-additional-catalogs.js" defer></script><script src="/i18n-errors.js" defer></script><script src="/i18n.js" defer></script><script src="/auth-error.js" defer></script></head><body><main class="auth-error-page" data-auth-error data-error-key="'+escapeHtml(value.i18n.key)+'" data-error-params="'+escapeHtml(JSON.stringify(value.i18n.params))+'"><a class="auth-error-brand" href="/?home=1"><img src="/cyro-logo.png" alt="">Cyro</a><h1 data-i18n>We couldn’t complete that request.</h1><p id="auth-error-message">'+escapeHtml(value.error)+'</p><div class="auth-error-actions"><a href="/auth/login" data-i18n>Try signing in again</a><a href="/?home=1" data-i18n>Back to Cyro</a><a href="/connections" data-i18n>Creator connections</a></div><label for="auth-error-language" data-i18n>Language</label><select id="auth-error-language" aria-label="Language" data-i18n-aria-label></select></main></body></html>';
}
