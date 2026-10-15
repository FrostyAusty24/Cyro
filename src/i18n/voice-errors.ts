/** Safe voice and music error templates; provider payloads are never shown to members. */
export const VOICE_ERROR_ROWS: ReadonlyArray<readonly [string, string, string, string, string]> = [
  [
    "Audio loading was cancelled or timed out.",
    "Le chargement audio a été annulé ou a expiré.",
    "La carga de audio se canceló o agotó el tiempo de espera.",
    "Das Laden der Audiodaten wurde abgebrochen oder hat zu lange gedauert.",
    "O carregamento do áudio foi cancelado ou excedeu o tempo limite."
  ],
  [
    "Audio playback was cancelled.",
    "La lecture audio a été annulée.",
    "La reproducción de audio se canceló.",
    "Die Audiowiedergabe wurde abgebrochen.",
    "A reprodução do áudio foi cancelada."
  ],
  [
    "Audio reached the maximum playback time.",
    "L’audio a atteint la durée maximale de lecture.",
    "El audio alcanzó el tiempo máximo de reproducción.",
    "Die maximale Wiedergabedauer wurde erreicht.",
    "O áudio atingiu o tempo máximo de reprodução."
  ],
  [
    "Choose a valid speech speaker name.",
    "Choisissez un nom valide pour la personne qui parle.",
    "Elige un nombre válido para quien habla.",
    "Wähle einen gültigen Sprechernamen.",
    "Escolha um nome válido para quem está falando."
  ],
  [
    "Choose one of the available TTS voices.",
    "Choisissez une des voix TTS disponibles.",
    "Elige una de las voces TTS disponibles.",
    "Wähle eine der verfügbaren TTS-Stimmen.",
    "Escolha uma das vozes TTS disponíveis."
  ],
  [
    "Choose valid voice settings: volume 5–100, track limit 1–30 minutes, and an available voice.",
    "Choisissez des paramètres vocaux valides : volume de 5 à 100, durée de piste de 1 à 30 minutes et une voix disponible.",
    "Elige ajustes de voz válidos: volumen de 5 a 100, límite de pista de 1 a 30 minutos y una voz disponible.",
    "Wähle gültige Spracheinstellungen: Lautstärke 5–100, Titellimit 1–30 Minuten und eine verfügbare Stimme.",
    "Escolha configurações de voz válidas: volume de 5–100, limite de faixa de 1–30 minutos e uma voz disponível."
  ],
  [
    "Compressed web responses cannot be used as music streams.",
    "Les réponses web compressées ne peuvent pas servir de flux musicaux.",
    "Las respuestas web comprimidas no se pueden usar como flujos de música.",
    "Komprimierte Webantworten können nicht als Musikstreams verwendet werden.",
    "Respostas da web comprimidas não podem ser usadas como transmissões de música."
  ],
  [
    "Could not connect to Discord voice. Check Connect/Speak permissions and host UDP access.",
    "Impossible de se connecter à l’audio Discord. Vérifiez les permissions Se connecter et Parler, ainsi que l’accès UDP de l’hébergement.",
    "No se pudo conectar al audio de Discord. Revisa los permisos Conectar y Hablar y el acceso UDP del alojamiento.",
    "Verbindung mit Discord-Sprachchat fehlgeschlagen. Prüfe Verbinden/Sprechen und den UDP-Zugang des Hosts.",
    "Não foi possível conectar ao áudio do Discord. Confira as permissões Conectar/Falar e o acesso UDP da hospedagem."
  ],
  [
    "Could not play audio.",
    "Impossible de lire l’audio.",
    "No se pudo reproducir el audio.",
    "Audio konnte nicht abgespielt werden.",
    "Não foi possível reproduzir o áudio."
  ],
  [
    "Cyro has too many speech messages waiting. Try again shortly.",
    "Cyro a trop de messages vocaux en attente. Réessayez dans un instant.",
    "Cyro tiene demasiados mensajes de voz en espera. Inténtalo de nuevo en un momento.",
    "Bei Cyro warten zu viele Sprachnachrichten. Versuche es gleich noch einmal.",
    "O Cyro tem muitas mensagens de voz na fila. Tente novamente em instantes."
  ],
  [
    "Cyro is already in another voice channel. Stop that session there first.",
    "Cyro est déjà dans un autre salon vocal. Arrêtez d’abord cette session là-bas.",
    "Cyro ya está en otro canal de voz. Detén primero esa sesión allí.",
    "Cyro ist bereits in einem anderen Sprachkanal. Beende zuerst dort die Sitzung.",
    "O Cyro já está em outro canal de voz. Encerre aquela sessão lá primeiro."
  ],
  [
    "Cyro is already playing in several calls. Try again shortly.",
    "Cyro joue déjà dans plusieurs appels. Réessayez dans un instant.",
    "Cyro ya está reproduciendo audio en varias llamadas. Inténtalo de nuevo en un momento.",
    "Cyro spielt bereits in mehreren Anrufen. Versuche es gleich noch einmal.",
    "O Cyro já está reproduzindo áudio em várias chamadas. Tente novamente em instantes."
  ],
  [
    "Cyro is at its current voice capacity. Please try again later.",
    "Cyro a atteint sa capacité vocale actuelle. Réessayez plus tard.",
    "Cyro ha alcanzado su capacidad actual de voz. Inténtalo más tarde.",
    "Cyro hat seine aktuelle Sprachkapazität erreicht. Versuche es später erneut.",
    "O Cyro atingiu sua capacidade atual de voz. Tente novamente mais tarde."
  ],
  [
    "Cyro is currently in music mode. Stop it before switching modes.",
    "Cyro est en mode musique. Arrêtez-le avant de changer de mode.",
    "Cyro está en modo música. Detén la sesión antes de cambiar de modo.",
    "Cyro ist im Musikmodus. Beende ihn, bevor du den Modus wechselst.",
    "O Cyro está no modo música. Encerre a sessão antes de mudar de modo."
  ],
  [
    "Cyro is currently in tts mode. Stop it before switching modes.",
    "Cyro est en mode TTS. Arrêtez-le avant de changer de mode.",
    "Cyro está en modo TTS. Detén la sesión antes de cambiar de modo.",
    "Cyro ist im TTS-Modus. Beende ihn, bevor du den Modus wechselst.",
    "O Cyro está no modo TTS. Encerre a sessão antes de mudar de modo."
  ],
  [
    "Cyro is loading other YouTube tracks. Try again in a moment.",
    "Cyro charge d’autres pistes YouTube. Réessayez dans un instant.",
    "Cyro está cargando otras pistas de YouTube. Inténtalo de nuevo en un momento.",
    "Cyro lädt andere YouTube-Titel. Versuche es gleich noch einmal.",
    "O Cyro está carregando outras faixas do YouTube. Tente novamente em instantes."
  ],
  [
    "Cyro is no longer in this server.",
    "Cyro n’est plus dans ce serveur.",
    "Cyro ya no está en este servidor.",
    "Cyro ist nicht mehr auf diesem Server.",
    "O Cyro não está mais neste servidor."
  ],
  [
    "German voices are not installed on this host yet. Choose another language or ask the bot operator to install them.",
    "Les voix allemandes ne sont pas encore installées sur cet hébergement. Choisissez une autre langue ou demandez à l’opérateur du bot de les installer.",
    "Las voces alemanas aún no están instaladas en este alojamiento. Elige otro idioma o pide al operador del bot que las instale.",
    "Deutsche Stimmen sind auf diesem Host noch nicht installiert. Wähle eine andere Sprache oder bitte den Bot-Betreiber, sie zu installieren.",
    "As vozes em alemão ainda não estão instaladas nesta hospedagem. Escolha outro idioma ou peça ao operador do bot para instalá-las."
  ],
  [
    "Join the same voice channel as Cyro to use this control.",
    "Rejoignez le même salon vocal que Cyro pour utiliser cette commande.",
    "Únete al mismo canal de voz que Cyro para usar este control.",
    "Tritt demselben Sprachkanal wie Cyro bei, um diese Steuerung zu verwenden.",
    "Entre no mesmo canal de voz que o Cyro para usar este controle."
  ],
  [
    "Music links must point to a public internet address.",
    "Les liens musicaux doivent pointer vers une adresse Internet publique.",
    "Los enlaces de música deben apuntar a una dirección pública de Internet.",
    "Musiklinks müssen auf eine öffentliche Internetadresse verweisen.",
    "Os links de música precisam apontar para um endereço público na internet."
  ],
  [
    "Music links must resolve only to public internet addresses.",
    "Les liens musicaux doivent uniquement se résoudre vers des adresses Internet publiques.",
    "Los enlaces de música deben resolverse únicamente a direcciones públicas de Internet.",
    "Musiklinks dürfen nur in öffentliche Internetadressen aufgelöst werden.",
    "Os links de música devem resolver apenas para endereços públicos na internet."
  ],
  [
    "Natural speech could not be generated for this message.",
    "Impossible de générer la voix naturelle pour ce message.",
    "No se pudo generar voz natural para este mensaje.",
    "Für diese Nachricht konnte keine natürliche Sprache erzeugt werden.",
    "Não foi possível gerar voz natural para esta mensagem."
  ],
  [
    "Natural speech could not be generated. Try again shortly.",
    "Impossible de générer la voix naturelle. Réessayez dans un instant.",
    "No se pudo generar voz natural. Inténtalo de nuevo en un momento.",
    "Natürliche Sprache konnte nicht erzeugt werden. Versuche es gleich noch einmal.",
    "Não foi possível gerar voz natural. Tente novamente em instantes."
  ],
  [
    "Natural voices are not installed on this host yet.",
    "Les voix naturelles ne sont pas encore installées sur cet hébergement.",
    "Las voces naturales aún no están instaladas en este alojamiento.",
    "Natürliche Stimmen sind auf diesem Host noch nicht installiert.",
    "As vozes naturais ainda não estão instaladas nesta hospedagem."
  ],
  [
    "Natural voices are unavailable on this host.",
    "Les voix naturelles sont indisponibles sur cet hébergement.",
    "Las voces naturales no están disponibles en este alojamiento.",
    "Natürliche Stimmen sind auf diesem Host nicht verfügbar.",
    "As vozes naturais estão indisponíveis nesta hospedagem."
  ],
  [
    "Natural voices could not load on this host.",
    "Les voix naturelles n’ont pas pu être chargées sur cet hébergement.",
    "No se pudieron cargar las voces naturales en este alojamiento.",
    "Natürliche Stimmen konnten auf diesem Host nicht geladen werden.",
    "Não foi possível carregar as vozes naturais nesta hospedagem."
  ],
  [
    "Only public, unrestricted recorded YouTube videos are supported. Live or restricted videos cannot play.",
    "Seules les vidéos YouTube enregistrées, publiques et sans restriction sont prises en charge. Les vidéos en direct ou restreintes ne peuvent pas être lues.",
    "Solo se admiten videos grabados de YouTube públicos y sin restricciones. Los directos y videos restringidos no se pueden reproducir.",
    "Es werden nur öffentliche, uneingeschränkte YouTube-Aufzeichnungen unterstützt. Live- oder eingeschränkte Videos können nicht abgespielt werden.",
    "Apenas vídeos gravados do YouTube, públicos e sem restrições, são compatíveis. Lives e vídeos restritos não podem ser reproduzidos."
  ],
  [
    "Speech is stopping.",
    "La synthèse vocale est en cours d’arrêt.",
    "La síntesis de voz se está deteniendo.",
    "Die Sprachausgabe wird beendet.",
    "A síntese de voz está sendo encerrada."
  ],
  [
    "Speech must contain 1–{max} characters.",
    "Le texte à lire doit contenir entre 1 et {max} caractères.",
    "El texto de voz debe tener entre 1 y {max} caracteres.",
    "Der Sprechtext muss 1–{max} Zeichen enthalten.",
    "O texto da fala deve ter entre 1 e {max} caracteres."
  ],
  [
    "Speech took too long. Try a shorter message.",
    "La synthèse vocale a pris trop de temps. Essayez un message plus court.",
    "La síntesis de voz tardó demasiado. Prueba un mensaje más corto.",
    "Die Sprachausgabe hat zu lange gedauert. Versuche eine kürzere Nachricht.",
    "A síntese de voz demorou demais. Tente uma mensagem mais curta."
  ],
  [
    "Speech was cancelled.",
    "La synthèse vocale a été annulée.",
    "La síntesis de voz se canceló.",
    "Die Sprachausgabe wurde abgebrochen.",
    "A síntese de voz foi cancelada."
  ],
  [
    "Spotify links do not provide playable audio to Cyro. Use a direct audio file or radio-stream URL instead.",
    "Les liens Spotify ne fournissent pas d’audio lisible à Cyro. Utilisez un lien direct vers un fichier audio ou une radio.",
    "Los enlaces de Spotify no proporcionan audio reproducible a Cyro. Usa un enlace directo a un archivo de audio o una emisora de radio.",
    "Spotify-Links stellen Cyro keine abspielbaren Audiodaten bereit. Verwende eine direkte Audiodatei- oder Radiostream-URL.",
    "Links do Spotify não fornecem áudio reproduzível ao Cyro. Use um link direto de arquivo de áudio ou de rádio."
  ],
  [
    "Stop the current mode before switching between music and TTS.",
    "Arrêtez le mode actuel avant de passer de la musique au TTS ou inversement.",
    "Detén el modo actual antes de cambiar entre música y TTS.",
    "Beende den aktuellen Modus, bevor du zwischen Musik und TTS wechselst.",
    "Encerre o modo atual antes de alternar entre música e TTS."
  ],
  [
    "That YouTube audio exceeds the music size limit.",
    "L’audio YouTube dépasse la taille maximale autorisée pour la musique.",
    "Ese audio de YouTube supera el límite de tamaño de música.",
    "Diese YouTube-Audiodatei überschreitet das Größenlimit für Musik.",
    "Esse áudio do YouTube excede o limite de tamanho de música."
  ],
  [
    "That YouTube video exceeds this server’s {minutes}-minute music limit.",
    "Cette vidéo YouTube dépasse la limite musicale de {minutes} minutes de ce serveur.",
    "Ese video de YouTube supera el límite de música de {minutes} minutos de este servidor.",
    "Dieses YouTube-Video überschreitet das Musiklimit dieses Servers von {minutes} Minuten.",
    "Esse vídeo do YouTube excede o limite de música de {minutes} minutos deste servidor."
  ],
  [
    "That audio file exceeds the music download limit.",
    "Ce fichier audio dépasse la limite de téléchargement de musique.",
    "Ese archivo de audio supera el límite de descarga de música.",
    "Diese Audiodatei überschreitet das Downloadlimit für Musik.",
    "Esse arquivo de áudio excede o limite de download de música."
  ],
  [
    "That link is not a direct supported audio stream. Use an MP3, WAV, OGG, FLAC, AAC, M4A or radio-stream URL.",
    "Ce lien n’est pas un flux audio direct pris en charge. Utilisez un lien MP3, WAV, OGG, FLAC, AAC, M4A ou une radio.",
    "Ese enlace no es un flujo de audio directo compatible. Usa una URL de MP3, WAV, OGG, FLAC, AAC, M4A o radio.",
    "Dieser Link ist kein unterstützter direkter Audiostream. Verwende eine MP3-, WAV-, OGG-, FLAC-, AAC-, M4A- oder Radiostream-URL.",
    "Esse link não é uma transmissão direta de áudio compatível. Use uma URL de MP3, WAV, OGG, FLAC, AAC, M4A ou rádio."
  ],
  [
    "The YouTube media URL is too long.",
    "L’URL du média YouTube est trop longue.",
    "La URL del medio de YouTube es demasiado larga.",
    "Die YouTube-Medien-URL ist zu lang.",
    "A URL da mídia do YouTube é muito longa."
  ],
  [
    "The YouTube source could not start. Ask the bot operator to check its installation.",
    "La source YouTube n’a pas pu démarrer. Demandez à l’opérateur du bot de vérifier son installation.",
    "No se pudo iniciar la fuente de YouTube. Pide al operador del bot que revise su instalación.",
    "Die YouTube-Quelle konnte nicht starten. Bitte den Bot-Betreiber, die Installation zu prüfen.",
    "Não foi possível iniciar a fonte do YouTube. Peça ao operador do bot para verificar a instalação."
  ],
  [
    "The audio decoder could not start.",
    "Le décodeur audio n’a pas pu démarrer.",
    "No se pudo iniciar el decodificador de audio.",
    "Der Audiodecoder konnte nicht starten.",
    "Não foi possível iniciar o decodificador de áudio."
  ],
  [
    "The audio decoder stopped accepting data.",
    "Le décodeur audio a cessé d’accepter les données.",
    "El decodificador de audio dejó de aceptar datos.",
    "Der Audiodecoder nimmt keine Daten mehr an.",
    "O decodificador de áudio parou de aceitar dados."
  ],
  [
    "The audio decoder took too long to start.",
    "Le décodeur audio a mis trop de temps à démarrer.",
    "El decodificador de audio tardó demasiado en iniciarse.",
    "Der Audiodecoder hat zu lange zum Starten gebraucht.",
    "O decodificador de áudio demorou demais para iniciar."
  ],
  [
    "The audio link redirects too many times.",
    "Le lien audio redirige trop de fois.",
    "El enlace de audio redirige demasiadas veces.",
    "Der Audiolink leitet zu oft weiter.",
    "O link de áudio redireciona vezes demais."
  ],
  [
    "The audio server took too long to respond.",
    "Le serveur audio a mis trop de temps à répondre.",
    "El servidor de audio tardó demasiado en responder.",
    "Der Audioserver hat zu lange zum Antworten gebraucht.",
    "O servidor de áudio demorou demais para responder."
  ],
  [
    "The audio stream stopped responding.",
    "Le flux audio ne répond plus.",
    "El flujo de audio dejó de responder.",
    "Der Audiostream antwortet nicht mehr.",
    "A transmissão de áudio parou de responder."
  ],
  [
    "The music URL is too long.",
    "L’URL de la musique est trop longue.",
    "La URL de música es demasiado larga.",
    "Die Musik-URL ist zu lang.",
    "A URL da música é muito longa."
  ],
  [
    "The music decoder is not installed on this host. Ask an administrator to finish the FFmpeg setup.",
    "Le décodeur musical n’est pas installé sur cet hébergement. Demandez à un administrateur de terminer la configuration de FFmpeg.",
    "El decodificador de música no está instalado en este alojamiento. Pide a un administrador que termine la configuración de FFmpeg.",
    "Der Musikdecoder ist auf diesem Host nicht installiert. Bitte einen Administrator, die FFmpeg-Einrichtung abzuschließen.",
    "O decodificador de música não está instalado nesta hospedagem. Peça a um administrador para concluir a configuração do FFmpeg."
  ],
  [
    "The music stream ended unexpectedly.",
    "Le flux musical s’est arrêté de façon inattendue.",
    "El flujo de música terminó inesperadamente.",
    "Der Musikstream wurde unerwartet beendet.",
    "A transmissão de música terminou inesperadamente."
  ],
  [
    "The music stream reached its download limit.",
    "Le flux musical a atteint sa limite de téléchargement.",
    "El flujo de música alcanzó su límite de descarga.",
    "Der Musikstream hat sein Downloadlimit erreicht.",
    "A transmissão de música atingiu seu limite de download."
  ],
  [
    "The natural speech worker could not start.",
    "Le processus de synthèse vocale naturelle n’a pas pu démarrer.",
    "No se pudo iniciar el proceso de voz natural.",
    "Der Prozess für natürliche Sprachausgabe konnte nicht starten.",
    "Não foi possível iniciar o processo de voz natural."
  ],
  [
    "The speech worker could not accept this message.",
    "Le processus vocal n’a pas pu accepter ce message.",
    "El proceso de voz no pudo aceptar este mensaje.",
    "Der Sprachprozess konnte diese Nachricht nicht annehmen.",
    "O processo de voz não conseguiu aceitar esta mensagem."
  ],
  [
    "The speech worker disconnected.",
    "Le processus vocal s’est déconnecté.",
    "El proceso de voz se desconectó.",
    "Der Sprachprozess wurde getrennt.",
    "O processo de voz foi desconectado."
  ],
  [
    "The voice connection has closed.",
    "La connexion vocale est fermée.",
    "La conexión de voz se ha cerrado.",
    "Die Sprachverbindung wurde geschlossen.",
    "A conexão de voz foi encerrada."
  ],
  [
    "The voice connection is not ready.",
    "La connexion vocale n’est pas prête.",
    "La conexión de voz no está lista.",
    "Die Sprachverbindung ist noch nicht bereit.",
    "A conexão de voz ainda não está pronta."
  ],
  [
    "This TTS session has ended.",
    "Cette session TTS est terminée.",
    "Esta sesión TTS ha terminado.",
    "Diese TTS-Sitzung ist beendet.",
    "Esta sessão TTS terminou."
  ],
  [
    "This YouTube video is unavailable or restricted. Use a public, unrestricted recorded video.",
    "Cette vidéo YouTube est indisponible ou restreinte. Utilisez une vidéo enregistrée, publique et sans restriction.",
    "Este video de YouTube no está disponible o tiene restricciones. Usa un video grabado público y sin restricciones.",
    "Dieses YouTube-Video ist nicht verfügbar oder eingeschränkt. Verwende ein öffentliches, uneingeschränktes aufgezeichnetes Video.",
    "Este vídeo do YouTube está indisponível ou restrito. Use um vídeo gravado, público e sem restrições."
  ],
  [
    "This audio format could not be played. Use a direct MP3, WAV, OGG, FLAC or AAC stream.",
    "Ce format audio n’a pas pu être lu. Utilisez un flux direct MP3, WAV, OGG, FLAC ou AAC.",
    "No se pudo reproducir este formato de audio. Usa un flujo directo MP3, WAV, OGG, FLAC o AAC.",
    "Dieses Audioformat konnte nicht abgespielt werden. Verwende einen direkten MP3-, WAV-, OGG-, FLAC- oder AAC-Stream.",
    "Não foi possível reproduzir este formato de áudio. Use uma transmissão direta de MP3, WAV, OGG, FLAC ou AAC."
  ],
  [
    "This link did not contain playable audio.",
    "Ce lien ne contenait pas d’audio lisible.",
    "Este enlace no contenía audio reproducible.",
    "Dieser Link enthielt keine abspielbaren Audiodaten.",
    "Este link não continha áudio reproduzível."
  ],
  [
    "Use a full http:// or https:// link to playable audio.",
    "Utilisez un lien http:// ou https:// complet vers de l’audio lisible.",
    "Usa un enlace completo http:// o https:// a audio reproducible.",
    "Verwende einen vollständigen http://- oder https://-Link zu abspielbaren Audiodaten.",
    "Use um link http:// ou https:// completo para áudio reproduzível."
  ],
  [
    "Use a single YouTube video link. Playlists and channel pages are not supported.",
    "Utilisez un lien vers une seule vidéo YouTube. Les playlists et pages de chaînes ne sont pas prises en charge.",
    "Usa un enlace a un solo video de YouTube. Las listas de reproducción y las páginas de canales no son compatibles.",
    "Verwende einen Link zu einem einzelnen YouTube-Video. Playlists und Kanalseiten werden nicht unterstützt.",
    "Use um link para um único vídeo do YouTube. Playlists e páginas de canais não são compatíveis."
  ],
  [
    "Use a single public YouTube video link.",
    "Utilisez un lien vers une seule vidéo YouTube publique.",
    "Usa un enlace a un solo video público de YouTube.",
    "Verwende einen Link zu einem einzelnen öffentlichen YouTube-Video.",
    "Use um link para um único vídeo público do YouTube."
  ],
  [
    "Use a supported single YouTube video link with /playmusic, or a direct audio or radio-stream URL. This YouTube URL type cannot be played.",
    "Utilisez un lien vers une seule vidéo YouTube prise en charge avec /playmusic, ou un lien audio direct ou de radio. Ce type d’URL YouTube n’est pas lisible.",
    "Usa un enlace a un solo video de YouTube compatible con /playmusic, o una URL directa de audio o radio. Este tipo de URL de YouTube no se puede reproducir.",
    "Verwende mit /playmusic einen unterstützten Link zu einem einzelnen YouTube-Video oder eine direkte Audio- oder Radiostream-URL. Dieser YouTube-URL-Typ ist nicht abspielbar.",
    "Use um link compatível para um único vídeo do YouTube com /playmusic, ou uma URL direta de áudio ou rádio. Este tipo de URL do YouTube não pode ser reproduzido."
  ],
  [
    "Use an HTTP(S) audio link without a login, on a standard web or radio port.",
    "Utilisez un lien audio HTTP(S) sans connexion requise, sur un port web ou radio standard.",
    "Usa un enlace de audio HTTP(S) sin inicio de sesión, en un puerto web o de radio estándar.",
    "Verwende einen HTTP(S)-Audiolink ohne Anmeldung über einen üblichen Web- oder Radioport.",
    "Use um link de áudio HTTP(S) sem login, em uma porta padrão de web ou rádio."
  ],
  [
    "Use an HTTPS link to a single public YouTube video.",
    "Utilisez un lien HTTPS vers une seule vidéo YouTube publique.",
    "Usa un enlace HTTPS a un solo video público de YouTube.",
    "Verwende einen HTTPS-Link zu einem einzelnen öffentlichen YouTube-Video.",
    "Use um link HTTPS para um único vídeo público do YouTube."
  ],
  [
    "Voice connection was closed.",
    "La connexion vocale a été fermée.",
    "La conexión de voz se cerró.",
    "Die Sprachverbindung wurde geschlossen.",
    "A conexão de voz foi encerrada."
  ],
  [
    "Voice session cancelled.",
    "Session vocale annulée.",
    "Sesión de voz cancelada.",
    "Sprachsitzung abgebrochen.",
    "Sessão de voz cancelada."
  ],
  [
    "YouTube could not provide audio for this video. Try another public video or a direct audio link.",
    "YouTube n’a pas pu fournir l’audio de cette vidéo. Essayez une autre vidéo publique ou un lien audio direct.",
    "YouTube no pudo proporcionar audio para este video. Prueba otro video público o un enlace de audio directo.",
    "YouTube konnte für dieses Video kein Audio bereitstellen. Versuche ein anderes öffentliches Video oder einen direkten Audiolink.",
    "O YouTube não conseguiu fornecer áudio para este vídeo. Tente outro vídeo público ou um link direto de áudio."
  ],
  [
    "YouTube did not provide a supported direct audio stream for this video.",
    "YouTube n’a pas fourni de flux audio direct pris en charge pour cette vidéo.",
    "YouTube no proporcionó un flujo de audio directo compatible para este video.",
    "YouTube hat für dieses Video keinen unterstützten direkten Audiostream bereitgestellt.",
    "O YouTube não forneceu uma transmissão direta de áudio compatível para este vídeo."
  ],
  [
    "YouTube did not provide a supported recorded-video duration.",
    "YouTube n’a pas fourni de durée de vidéo enregistrée prise en charge.",
    "YouTube no proporcionó una duración de video grabado compatible.",
    "YouTube hat keine unterstützte Dauer für das aufgezeichnete Video bereitgestellt.",
    "O YouTube não forneceu uma duração compatível para o vídeo gravado."
  ],
  [
    "YouTube did not return a playable single video.",
    "YouTube n’a pas renvoyé une vidéo unique lisible.",
    "YouTube no devolvió un único video reproducible.",
    "YouTube hat kein einzelnes abspielbares Video zurückgegeben.",
    "O YouTube não retornou um único vídeo reproduzível."
  ],
  [
    "YouTube is refusing playback from Cyro’s host for this video. Try another source; account or bot-check restrictions are not bypassed.",
    "YouTube refuse la lecture de cette vidéo depuis l’hébergement de Cyro. Essayez une autre source ; les restrictions de compte ou de vérification anti-bot ne sont pas contournées.",
    "YouTube rechaza la reproducción de este video desde el alojamiento de Cyro. Prueba otra fuente; no se eluden las restricciones de cuenta ni las comprobaciones anti-bot.",
    "YouTube verweigert die Wiedergabe dieses Videos von Cyros Host. Versuche eine andere Quelle. Konto- oder Bot-Prüfungen werden nicht umgangen.",
    "O YouTube está recusando a reprodução deste vídeo a partir da hospedagem do Cyro. Tente outra fonte; restrições de conta e verificações anti-bot não são contornadas."
  ],
  [
    "YouTube loading was cancelled.",
    "Le chargement YouTube a été annulé.",
    "La carga de YouTube se canceló.",
    "Das Laden von YouTube wurde abgebrochen.",
    "O carregamento do YouTube foi cancelado."
  ],
  [
    "YouTube media must use its public HTTPS audio delivery service.",
    "Les médias YouTube doivent utiliser leur service public de diffusion audio HTTPS.",
    "Los medios de YouTube deben usar su servicio público de distribución de audio HTTPS.",
    "YouTube-Medien müssen den öffentlichen HTTPS-Audiodienst von YouTube verwenden.",
    "As mídias do YouTube devem usar o serviço público HTTPS de distribuição de áudio do YouTube."
  ],
  [
    "YouTube playback is not installed on this host yet. The bot operator needs to run the YouTube source installer.",
    "La lecture YouTube n’est pas encore installée sur cet hébergement. L’opérateur du bot doit lancer l’installateur de la source YouTube.",
    "La reproducción de YouTube aún no está instalada en este alojamiento. El operador del bot debe ejecutar el instalador de la fuente de YouTube.",
    "YouTube-Wiedergabe ist auf diesem Host noch nicht installiert. Der Bot-Betreiber muss das Installationsprogramm für die YouTube-Quelle ausführen.",
    "A reprodução do YouTube ainda não está instalada nesta hospedagem. O operador do bot precisa executar o instalador da fonte do YouTube."
  ],
  [
    "YouTube refused or could not deliver this audio from Cyro’s host. Try another video or a direct audio link.",
    "YouTube a refusé ou n’a pas pu fournir cet audio depuis l’hébergement de Cyro. Essayez une autre vidéo ou un lien audio direct.",
    "YouTube rechazó o no pudo proporcionar este audio desde el alojamiento de Cyro. Prueba otro video o un enlace de audio directo.",
    "YouTube hat die Bereitstellung dieses Audios von Cyros Host verweigert oder konnte es nicht liefern. Versuche ein anderes Video oder einen direkten Audiolink.",
    "O YouTube recusou ou não conseguiu fornecer este áudio a partir da hospedagem do Cyro. Tente outro vídeo ou um link direto de áudio."
  ],
  [
    "YouTube returned an unsupported media source.",
    "YouTube a renvoyé une source média non prise en charge.",
    "YouTube devolvió una fuente multimedia no compatible.",
    "YouTube hat eine nicht unterstützte Medienquelle zurückgegeben.",
    "O YouTube retornou uma fonte de mídia incompatível."
  ],
  [
    "YouTube returned invalid source data. Try another video.",
    "YouTube a renvoyé des données de source invalides. Essayez une autre vidéo.",
    "YouTube devolvió datos de fuente no válidos. Prueba otro video.",
    "YouTube hat ungültige Quelldaten zurückgegeben. Versuche ein anderes Video.",
    "O YouTube retornou dados de fonte inválidos. Tente outro vídeo."
  ],
  [
    "YouTube returned too much source data. Try another video.",
    "YouTube a renvoyé trop de données de source. Essayez une autre vidéo.",
    "YouTube devolvió demasiados datos de fuente. Prueba otro video.",
    "YouTube hat zu viele Quelldaten zurückgegeben. Versuche ein anderes Video.",
    "O YouTube retornou dados de fonte demais. Tente outro vídeo."
  ],
  [
    "YouTube took too long to load. Try another source.",
    "YouTube a mis trop de temps à charger. Essayez une autre source.",
    "YouTube tardó demasiado en cargar. Prueba otra fuente.",
    "Das Laden von YouTube hat zu lange gedauert. Versuche eine andere Quelle.",
    "O YouTube demorou demais para carregar. Tente outra fonte."
  ],
  [
    "Cyro is currently in music mode.",
    "Cyro est actuellement en mode musique.",
    "Cyro está en modo música.",
    "Cyro ist gerade im Musikmodus.",
    "O Cyro está no modo música."
  ],
  [
    "Cyro is currently in TTS mode.",
    "Cyro est actuellement en mode TTS.",
    "Cyro está en modo TTS.",
    "Cyro ist gerade im TTS-Modus.",
    "O Cyro está no modo TTS."
  ],
  [
    "The audio server could not be reached.",
    "Le serveur audio est injoignable.",
    "No se pudo contactar con el servidor de audio.",
    "Der Audioserver konnte nicht erreicht werden.",
    "Não foi possível acessar o servidor de áudio."
  ],
  [
    "The audio server could not play this link.",
    "Le serveur audio n’a pas pu lire ce lien.",
    "El servidor de audio no pudo reproducir este enlace.",
    "Der Audioserver konnte diesen Link nicht abspielen.",
    "O servidor de áudio não conseguiu reproduzir este link."
  ],
  [
    "The audio stream ended unexpectedly.",
    "Le flux audio s’est arrêté de façon inattendue.",
    "El flujo de audio terminó inesperadamente.",
    "Der Audiostream wurde unerwartet beendet.",
    "A transmissão de áudio terminou inesperadamente."
  ]
];
