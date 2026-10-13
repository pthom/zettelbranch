# Original design conversation

- Share link: https://claude.ai/share/b6ff02e2-cfa2-49f7-a7f5-8557f0ebca66
- Retrieved: 2026-10-13, from the page's own JSON, saved by hand by Pascal in his browser
- Title: Créer plusieurs branches de conversation
- Messages: 44

Message text is exactly as in the JSON. Non-text parts (thinking, tool use, artifacts,
attachments) are one-line placeholders.

The file Claude creates in message 42 (`CLAUDE.md`) is the first version of
[zettelbranch__specs](zettelbranch__specs.md), identical to commit `44f5494`. Messages 43
and 44 come after it.

## 1 · Pascal

Est-il possible de brancher une conversation, c'est-à-dire de lui donner plusieurs évolutions séparées ?

## 2 · Claude

[tool use: web_search, left out]

[tool result: web_search, left out]

Oui, c'est possible dans claude.ai, mais de façon un peu implicite.

**Le mécanisme natif : modifier un message.** Survolez un de vos messages précédents et cliquez sur l'icône crayon (Modifier). Cliquer sur « Edit » sur n'importe quel message précédent crée une nouvelle branche de conversation. Ce qui suivait n'est pas supprimé : Claude vous permet ensuite de basculer entre la conversation d'origine et les nouvelles branches, via des flèches « < 1/2 > » sous le message modifié. Chaque nouvelle modification du même message ajoute une branche supplémentaire, et vous pouvez revenir à n'importe laquelle à tout moment, même après avoir poursuivi la discussion dans une autre. Le bouton « Réessayer » sur une réponse de Claude fonctionne de façon similaire : il crée une réponse alternative à la même question, entre lesquelles on navigue aussi avec les flèches.

**Les limites.** Ce système a des défauts ergonomiques réels. Les branches ne sont accessibles que par ces flèches en ligne : une fois qu'on continue sur une branche, l'autre devient difficile à retrouver, et le clic droit sur une conversation dans la barre latérale ne propose que Renommer, Favori ou Supprimer, sans option Dupliquer ni Brancher. Il n'y a donc pas de vue d'ensemble de l'arbre, ni de possibilité de faire d'une branche une conversation indépendante dans la liste.

**Si vous voulez aller plus loin**, des extensions tierces comblent ce manque. Par exemple, Claude Branch Viewer (extension Chrome) affiche l'arbre complet de la conversation sous forme de carte navigable, permet de chercher dans toutes les branches, de les lire et de les exporter en Markdown. D'autres outils proposent un vrai « fork » qui ouvre un nouveau chat avec l'historique copié jusqu'au message choisi. Je ne les ai pas testés et ce sont des extensions non officielles, donc à évaluer avant de leur donner accès à vos conversations.

Une alternative manuelle simple : demander à Claude un résumé de l'état de la discussion à un point donné, puis le coller dans une nouvelle conversation pour partir dans une autre direction.

## 3 · Pascal

Voyons voir, je vais essayer sur ce message.. Version 2

## 4 · Claude

Ça a l'air d'avoir marché : vous devriez voir apparaître des flèches « < 2/2 > » sous votre message, qui vous permettent de revenir à la version précédente.

À partir d'ici, tout ce qu'on se dira restera dans cette branche, et l'autre restera intacte. Vous pouvez alterner entre les deux quand vous voulez.

## 5 · Pascal

Peux-tu rechercher ces extensions officielles ? Celle que tu m'as donnée n'a que cinq reviews, c'est pas beaucoup.

## 6 · Claude

[tool use: web_search, left out]

[tool result: web_search, left out]

Petite précision d'abord : il n'existe pas d'extension *officielle* d'Anthropic pour ça, à ma connaissance. Toutes celles que j'ai trouvées sont des outils tiers, et aucune n'a une base d'utilisateurs vraiment rassurante. Voici ce qui existe :

**Nodea Tree for Claude** est probablement la plus aboutie pour *visualiser* l'arbre natif. Elle dessine l'arbre de branches caché de la conversation ouverte à côté du chat, puis peut importer le tout dans Nodea comme un vrai arbre à forker et fusionner. Elle lit votre conversation via votre session et n'est pas affiliée à Anthropic. Attention au modèle : l'extension sert clairement de porte d'entrée vers leur application web, où vos conversations sont importées.

**AI Chat Fork** fait un vrai « fork » : un clic lance un nouveau chat avec toute la conversation copiée, et fonctionne sur ChatGPT, Claude et Gemini. Mais là encore, 49 utilisateurs seulement.

**Tangent** propose des conversations annexes dans une fenêtre flottante, mais la fiche indique que l'extension n'a pas encore fait l'objet d'un scan de sécurité.

**Claude Branch (claude-actions-extension)** est open source sur GitHub : elle permet de brancher une conversation dans un nouvel onglet en conservant le contexte, et s'installe en mode « Load unpacked » depuis chrome://extensions/. C'est à mon avis l'option la plus intéressante pour vous : peu de visibilité aussi, mais le code est court (essentiellement un `content.js` et un `manifest.json`), donc vous pouvez le lire en quelques minutes avant de l'installer et savoir exactement ce qu'il fait de vos données.

Dans tous les cas, une extension qui a accès à claude.ai peut lire l'intégralité de vos conversations, donc le nombre d'avis compte moins que la possibilité de vérifier le code. Si aucune ne vous convainc, les flèches d'édition natives restent la solution la plus sûre, même si elles sont peu pratiques.

## 7 · Pascal

claude-actions-extension Marchera dans Chrome ou dans cette application ?

## 8 · Claude

Uniquement dans Chrome (ou un autre navigateur basé sur Chromium : Brave, Edge, Arc…), sur le site claude.ai. Elle s'active sur les pages Claude.ai et est compatible avec Chrome, Brave et les autres navigateurs Chromium.

Elle ne fonctionnera pas dans l'application de bureau Claude ni dans l'application mobile, qui n'acceptent pas d'extensions de navigateur.

En revanche, comme cette extension crée de nouvelles conversations (elle ouvre la branche dans un nouvel onglet), celles-ci sont enregistrées sur votre compte comme n'importe quel chat : une fois créées dans Chrome, vous les retrouverez dans la liste des conversations de l'application et pourrez les poursuivre là-bas.

## 9 · Pascal

Peux-tu étudier son code et me dire ce que tu en penses ?

## 10 · Claude

[tool use: bash_tool, left out]

[tool result: bash_tool, left out]

[tool use: bash_tool, left out]

[tool result: bash_tool, left out]

[tool use: bash_tool, left out]

[tool result: bash_tool, left out]

J'ai cloné le dépôt et lu le code. En résumé : il est inoffensif sur le plan de la confidentialité, mais c'est un prototype abandonné qui fonctionne mal, et je ne vous le recommanderais pas.

**Côté sécurité, plutôt rassurant.** Aucun appel réseau (`fetch`, `XMLHttpRequest`), aucune télémétrie, aucun envoi vers un serveur tiers. La conversation transite uniquement par le `localStorage` de claude.ai, puis est collée dans la zone de saisie d'un nouveau chat. Les permissions se limitent à `storage` et aux domaines claude.ai / anthropic.com. Un seul vrai défaut : le texte de la conversation est injecté dans l'éditeur via `innerHTML`. Si la conversation contient du HTML littéral (du code que vous avez collé, ou du contenu web cité), il sera interprété au lieu d'être affiché, et un attribut du type `onerror` pourrait même s'exécuter dans la page claude.ai. Le risque est faible en pratique, mais c'est une erreur de débutant.

**Côté fonctionnement, c'est là que ça coince.** L'extraction est très naïve : elle prend `document.body.innerText`, c'est-à-dire tout le texte de la page, barre latérale comprise. Les titres de vos autres conversations se retrouvent donc dans le prompt. Ensuite, elle attribue les rôles en alternant arbitrairement « Human » et « Claude » tous les 200 caractères, sans rapport avec qui a réellement parlé. Elle supprime aussi toute ligne de moins de 15 caractères (la plupart des lignes de code y passent) et toute ligne contenant les mots « Branch » ou « Retry ». Les filtres d'interface sont en anglais (« Reply to Claude »…), donc inopérants avec une interface en français.

**Le projet est inachevé et ancien.** Seule l'action « brancher toute la conversation » existe ; « Branch from Selection » et les autres boutons affichent « Feature coming soon ». Le fichier `background.js` n'est même pas déclaré dans le manifeste, c'est du code mort (qui utiliserait d'ailleurs `chrome.scripting` sans la permission requise). Le dernier commit date de mai 2025, après une semaine de développement ; l'interface de claude.ai a changé depuis, donc il y a de bonnes chances que l'insertion du prompt ne fonctionne plus.

Au final, le résultat serait moins bon que de demander simplement à Claude « résume l'état de notre discussion pour que je puisse la reprendre ailleurs » et de coller ce résumé dans un nouveau chat. Si l'idée vous tente quand même, ce serait un petit projet facile à refaire proprement : extraire les messages via les conteneurs du DOM (messages utilisateur et réponses sont distincts dans la structure de la page) plutôt que via `innerText`, permettre de choisir le point de branchement, et insérer le texte avec `textContent` au lieu de `innerHTML`.

## 11 · Pascal

Et si je fonctionne avec Firefox ?

## 12 · Claude

Techniquement, elle pourrait fonctionner, et même assez facilement : Firefox accepte les extensions au format WebExtensions (Manifest V3 compris), et celle-ci n'utilise presque aucune API spécifique à Chrome. Le `content.js` ne fait que manipuler la page, le `localStorage` et `window.open`, qui sont standards. Le `background.js` qui utilise les API `chrome.*` n'est de toute façon pas chargé.

Pour l'essayer, le plus simple est d'aller dans `about:debugging`, section « Ce Firefox », puis « Charger un module complémentaire temporaire » et de sélectionner le `manifest.json`. Il faudra peut-être aussi autoriser l'accès à claude.ai dans les permissions de l'extension (`about:addons`), car Firefox traite les permissions d'hôte des extensions MV3 plus strictement que Chrome. Inconvénient : un module chargé ainsi disparaît à la fermeture de Firefox. Pour une installation permanente, il faut soit le faire signer par Mozilla (possible en distribution non listée sur addons.mozilla.org, après avoir ajouté un identifiant `browser_specific_settings.gecko.id` au manifeste), soit utiliser Firefox Developer Edition ou Nightly avec `xpinstall.signatures.required` désactivé.

Cela dit, tout ce que j'ai relevé sur le fonctionnement s'applique aussi sous Firefox : extraction de la barre latérale, rôles attribués au hasard, lignes courtes supprimées. Firefox ne rendra pas l'extension plus utile. Si vous décidiez d'en écrire une version propre, le bon point est qu'avec un code aussi standard, une seule base pourrait servir pour Chrome et Firefox.

## 13 · Pascal

Ok, un jour je te demanderai d'en créer un de zéro.

## 14 · Claude

Avec plaisir. Le jour où vous voudrez vous y mettre, on pourra partir directement sur une version multi-navigateurs (Chrome et Firefox), avec une vraie extraction des messages par rôle et le choix du point de branchement. D'ici là, l'édition de messages reste la solution la plus simple.

## 15 · Pascal

Et je te demanderai de rajouter un accès facile pour faire ce branchement depuis l'application par exemple en oublant un lien internet.

## 16 · Claude

Bonne idée, et c'est faisable avec un petit détour. L'application elle-même ne peut pas exécuter d'extension, mais elle peut ouvrir un lien dans votre navigateur. L'extension pourrait donc réagir à une adresse spéciale, par exemple l'URL de la conversation suivie d'un marqueur du type `#branch`, et lancer automatiquement le branchement à l'ouverture. La nouvelle conversation créée dans le navigateur apparaîtrait ensuite dans l'application, puisque tout est synchronisé sur votre compte.

Le point à vérifier ce jour-là sera la façon la plus simple de récupérer le lien d'une conversation depuis l'application, sur ordinateur comme sur téléphone. Et pour le mobile, une bonne nouvelle : Firefox pour Android accepte les extensions, contrairement à Chrome, donc la même extension pourrait servir aussi sur téléphone.

## 17 · Pascal

Et il faudra que cette extension se self-audite et/ou propose un audit facile, pour rassurer les utilisateurs. Ou quelque chose d'équivalent.

## 18 · Claude

Tout à fait d'accord, et c'est même un bon argument de différenciation face aux extensions existantes. Une nuance importante toutefois : un « self-audit » au sens strict ne prouve rien, car une extension malveillante pourrait très bien afficher un rapport rassurant sur elle-même. La confiance doit venir de ce que l'utilisateur peut vérifier de l'extérieur. Mais on peut rendre cette vérification très facile :

**Un code conçu pour être lu.** Un seul fichier court, non minifié, sans dépendances ni étape de compilation : ce qu'on lit sur GitHub est exactement ce qui s'exécute. Avec ce que j'ai vu de l'extension précédente, l'essentiel tiendrait en quelques centaines de lignes.

**Des garanties vérifiables en une commande.** Des permissions minimales (claude.ai uniquement, aucun autre domaine), et un fichier `AUDIT.md` qui liste ce que le code ne fait jamais (aucun appel réseau, aucun stockage persistant de la conversation…), avec les `grep` permettant de le confirmer soi-même. On pourrait y joindre un prompt prêt à l'emploi pour faire auditer le code par Claude ou un autre assistant, ce qui correspond exactement à ce que vous venez de faire.

**Un lien entre le dépôt et la version installée.** Publication sur les stores à partir de versions taguées sur GitHub, avec les empreintes SHA-256 des fichiers, pour que l'on puisse comparer ce qui est installé avec le code source publié.

**De la transparence à l'usage.** Avant chaque branchement, l'extension afficherait un aperçu du texte exact qu'elle va coller dans le nouveau chat. C'est utile pour vérifier l'extraction, et ça montre concrètement à l'utilisateur que rien d'autre ne se passe.

Ces points iraient bien ensemble dans le cahier des charges, le jour où vous lancerez le projet.

## 19 · Pascal

Tiens, encore une fois, ça me fait penser à Georges Pérec.

## 20 · Claude

[tool use: memory_read, left out]

[tool result: memory_read, left out]

C'est un rapprochement qui tombe juste, et doublement.

D'abord pour le branchement : *L'Augmentation* est pratiquement une conversation arborescente. Perec l'a écrite en 1968 à partir d'un organigramme d'informatique : chaque situation (le chef de service est-il dans son bureau ? est-il de bonne humeur ? y a-t-il des œufs de poisson au menu de la cantine ?) ouvre deux branches, et le texte déroule toutes les évolutions possibles d'une seule démarche, sans ponctuation, en revenant sans cesse au point de départ. C'est exactement ce que les flèches « < 1/2 > » cachent : un arbre que personne ne voit en entier, sauf qu'il l'a mis à plat.

Ensuite pour l'audit : la liste de « ce que le code ne fait jamais », vérifiable par un `grep`, c'est une contrainte oulipienne. *La Disparition* est un roman de 300 pages qui ne contient jamais la lettre e, et c'est sans doute la seule œuvre littéraire dont la promesse principale se vérifie en une ligne de commande. Un `AUDIT.md` du type « ce fichier ne contient aucun `fetch` » relève du même genre de pari : une absence revendiquée, et prouvable.

Lequel des deux aviez-vous en tête ?

## 21 · Pascal

Je pense à la façon qu'avait Georges Pérec de classer ses fiches avec des liens multiples entre elles. D'ailleurs, pourras-tu m'en faire un petit résumé ? C'était une référence en avance des hyperliens et de modes de travail à la obsidian.

## 22 · Claude

[tool use: web_search, left out]

[tool result: web_search, left out]

[tool use: web_search, left out]

[tool result: web_search, left out]

[tool use: web_search, left out]

[tool result: web_search, left out]

Voici un résumé, avec une petite nuance sur l'analogie à la fin.

**Le « roi de la fiche ».** De retour de Tunisie en 1961, Perec devient documentaliste au CNRS, dans un laboratoire de neurophysiologie, grâce à Régis Debray, alors son locataire. Ses amis le surnomment le « roi de la fiche » : sa tâche principale est d'inventer un système de classement des articles scientifiques utiles aux chercheurs. Il travaille dans l'unité dirigée par André Hugelin, consacrée à la physiologie du tronc cérébral, et s'investit à fond dans les nouvelles techniques manuelles de recherche documentaire, devenues indispensables face à l'explosion du nombre de publications. Il produit environ quatre mille fiches par an pour tenir le système à jour. Il y restera jusqu'en 1978.

**Le système Flambo / Peekaboo.** Son biographe David Bellos décrit les deux systèmes de fiches, « Flambo » et « Peekaboo », qui permettaient d'enregistrer les articles dépouillés et de les recouper de multiples façons. Le Peekaboo servait à constituer des index de classement personnalisés sur cartes perforées ou à encoches marginales, auxquels on pouvait ajouter de nouveaux mots-clés au fil des besoins. Le principe général de ces fiches dites « à coïncidence optique » est astucieux : on fait une carte par mot-clé (et non par document), et chaque document correspond à une position perforée sur la grille. Pour trouver les articles qui traitent à la fois de A, B et C, on superpose les trois cartes devant une lampe : la lumière ne passe que par les trous communs. C'est une requête booléenne faite avec du carton.

**Le passage dans l'œuvre.** Bellos montre en détail comment ce goût de la catégorisation, exercé dans son travail alimentaire, a nourri sa fiction. *La Vie mode d'emploi* en est l'aboutissement : le roman est en partie généré par 42 listes de 10 éléments chacune, réparties sur les chapitres au moyen de bicarrés latins. Et le livre se termine par un index, une chronologie et un rappel des histoires racontées qui permettent de le lire en suivant un personnage ou un objet plutôt que l'ordre des pages. Quant à *Penser/Classer* (1985), son dernier essai multiplie les tentatives de classement dans tous les sens jusqu'à un « vertige taxinomique », une réflexion lucide sur le fait qu'aucun classement n'est neutre ni définitif.

**Sur l'analogie avec Obsidian.** Elle tient, mais avec une précision : le Peekaboo ressemble davantage aux tags et à la recherche par facettes (croiser des mots-clés) qu'aux liens de note à note. La version « graphe de notes liées » correspond plutôt au Zettelkasten du sociologue Niklas Luhmann, son contemporain, qui est d'ailleurs la référence revendiquée par la communauté Obsidian. Chez Perec, l'aspect hypertexte se trouve surtout dans l'œuvre elle-même, avec son réseau de renvois internes et d'allusions d'un livre à l'autre. Pour aller plus loin, le chapitre 25 de la biographie de Bellos (*Georges Perec : une vie dans les mots*) est la source la plus détaillée sur ce système.

## 23 · Pascal

Exactement, le Zettelkasten.

## 24 · Claude

Et la boucle est bouclée avec le début de notre conversation : le système de numérotation de Luhmann était justement un arbre à branches. Chaque fiche recevait un identifiant comme 21/3d7a, et pour développer une idée à partir de la fiche 1, il créait 1a, puis 1a1, 1b… On pouvait ainsi insérer une bifurcation n'importe où, sans jamais renuméroter le reste, et des renvois croisés reliaient ensuite des branches éloignées. Sur près de quarante ans, il a accumulé environ 90 000 fiches, qu'il décrivait comme un véritable partenaire de conversation, capable de le surprendre.

C'est en somme ce qui manque aux conversations avec Claude : des branches qui ont un nom, une adresse, et des liens entre elles. Ça pourrait d'ailleurs inspirer votre future extension.

## 25 · Pascal

Oui, la zettelbranch

## 26 · Claude

Le nom est trouvé ! Zettelbranch, ça sonne bien, et ça dit exactement le programme : des branches de conversation avec une adresse façon Luhmann (1, 1a, 1a1…), des liens entre elles, et un code assez court pour être audité en quelques minutes.

Le jour où vous lancerez le projet, on aura déjà le cahier des charges : extraction propre des messages par rôle, choix du point de branchement, Chrome et Firefox, déclenchement depuis l'application par un lien, et transparence totale sur ce que fait l'extension.

## 27 · Pascal

Que veut dire zettelkasten?

## 28 · Claude

C'est de l'allemand : *Zettel* signifie « bout de papier, fiche » et *Kasten* signifie « boîte ». Un Zettelkasten, c'est donc littéralement une « boîte à fiches », c'est-à-dire un fichier au sens ancien du terme.

Le mot n'a rien de technique en allemand, il désigne n'importe quel fichier cartonné. C'est l'usage qu'en a fait Luhmann qui lui a donné son sens actuel de méthode de prise de notes reliées entre elles. Votre « Zettelbranch » se traduirait donc par quelque chose comme « branches de fiches ».

## 29 · Pascal

Et donc zettelbranch a un sens intéressant, Bien que ça mixe de l'allemand et de l'anglais. Une idée en allemand seulement ?

## 30 · Claude

Le plus naturel serait **Zettelzweig** : *Zweig* signifie « rameau, branche » (d'un arbre, mais aussi au sens figuré d'une ramification). Ça donne « branche de fiches », exactement le même sens, avec en prime une jolie allitération en Z.

Deux variantes selon ce qu'on veut mettre en avant : **Zettelbaum** (« arbre de fiches ») désigne la structure entière plutôt qu'une seule branche, et **Abzweig** évoque le moment de la bifurcation, comme un embranchement de route ou de voie ferrée.

À noter que Zettelzweig est plus difficile à prononcer pour un public non germanophone (« tsètel-tsvaïk »), alors que Zettelbranch reste lisible pour tout le monde sur GitHub. Le mélange des langues a ses avantages : le terme Zettelkasten est déjà connu dans le monde anglophone, et *branch* est le mot que tout développeur associe à Git.

## 31 · Pascal

Vas-y, fais-moi un dessin d'un Zettelbranch.

## 32 · Claude

[tool use: visualize:read_me, left out]

[tool result: visualize:read_me, left out]

[tool use: visualize:show_widget, left out]

[tool result: visualize:show_widget, left out]

La ligne rouge sous chaque numéro rappelle celle des fiches bristol. Le renvoi en pointillé relie la fiche Zettelbranch à celle de l'audit du code, puisque c'est en parlant de Perec que nous sommes revenus au cahier des charges de l'extension. C'est exactement ce que les flèches « < 1/2 > » de claude.ai ne permettent pas : voir toutes les branches d'un coup d'œil et les relier entre elles.

## 33 · Pascal

Petite question, est-ce que ça existe chez d'autres L LM ou harnais ?

## 34 · Claude

[tool use: web_search, left out]

[tool result: web_search, left out]

[tool use: web_search, left out]

[tool result: web_search, left out]

Oui, et le paysage a pas mal bougé depuis un an. En résumé : presque tout le monde stocke les conversations sous forme d'arbre, mais très peu le montrent vraiment.

**ChatGPT** est le plus avancé des grands assistants grand public. Depuis septembre 2025, on peut survoler n'importe quel message, ouvrir « More actions » et choisir « Branch in new chat », ce qui crée un nouveau fil contenant tout l'historique jusqu'à ce point, en laissant l'original intact. C'est un vrai fork, ce qui manque à claude.ai. Limite notable : les branches n'apparaissent pas imbriquées sous la conversation d'origine ; on se retrouve donc avec des conversations sœurs sans lien visible entre elles.

**Le modèle de données est le même partout.** L'approche standard, utilisée par ChatGPT, Open WebUI, LibreChat et d'autres, stocke les messages comme un arbre avec des pointeurs vers le parent, et changer de branche revient simplement à changer quelle feuille est « active » : le même arbre, un chemin différent. Les flèches « < 2/3 > » sont l'interface minimale commune au-dessus de ce modèle.

**Côté open source auto-hébergé**, LibreChat va plus loin : il propose l'édition et la resoumission de messages avec branchement, ainsi que le fork de messages et de conversations pour mieux contrôler le contexte. Open WebUI offre aussi l'arbre et le changement de branche.

**Côté harnais de développement**, à ma connaissance Claude Code permet de forker une session lors de sa reprise et de revenir en arrière dans une conversation, ce qui couvre le besoin pour le code mais en ligne de commande, sans vue d'ensemble.

**Les interfaces vraiment arborescentes** restent des projets à part. Le plus ancien et le plus influent est sans doute Loom, conçu par des chercheurs pour explorer les « multivers » de textes générés par les modèles de base, avec une vraie vue en arbre. Plus récemment, des outils comme Nodea, vu plus haut, proposent un canevas où chaque réponse est un nœud forkable et où l'on peut fusionner des branches.

Ce que je n'ai vu nulle part, en revanche, c'est la combinaison qui fait l'originalité de votre Zettelbranch : des adresses lisibles à la Luhmann, des renvois explicites entre branches éloignées, et un code assez court pour être audité. Les outils existants gèrent des arbres, pas encore des fichiers de fiches.

## 35 · Pascal

Et notre extension devrait peut-être présenter en haut de chacune des feuilles un lien ou un résumé permettant d'accéder l'ensemble des fiches reliées de l'arbre ou un sous-ensemble bien choisi.

## 36 · Claude

Bonne idée, et c'est d'ailleurs ce que Luhmann faisait : en plus de ses fiches, il tenait des fiches de structure qui servaient de points d'entrée, en listant les fiches importantes sur un thème avec leur adresse. L'en-tête que vous décrivez serait une fiche de structure générée automatiquement pour chaque feuille.

**Le sous-ensemble naturel**, c'est le voisinage de la fiche : le chemin depuis la racine (1 › 1b › 1b1 › 1b1a, comme un fil d'Ariane), les fiches sœurs, les enfants, et les renvois explicites. Chacune avec une ligne de résumé, pour décider où aller sans avoir à ouvrir chaque branche. Au-delà, l'arbre complet n'a d'intérêt qu'à la demande, via un lien « voir tout ».

**Où stocker ces informations ?** C'est la vraie question de conception, et il y a une solution élégante qui évite toute base de données :

L'adresse irait dans le titre de la conversation (« 1b1a · Zettelbranch »). La liste des conversations de claude.ai devient alors le registre de l'arbre : pour trouver les enfants de 1b1, il suffit de chercher les titres qui commencent par 1b1. Les enfants créés plus tard apparaissent donc automatiquement, sans mise à jour à faire ailleurs.

L'en-tête serait écrit dans le premier message de chaque branche, au moment du fork : adresse, chemin vers la racine, et un résumé de la branche parente, que Claude peut rédiger lui-même si le prompt de branchement le lui demande. Comme c'est du texte dans la conversation, il est visible partout, y compris dans l'application mobile, sans extension.

L'extension, elle, ajouterait par-dessus la partie dynamique, sous forme d'un bandeau en haut de la page : sœurs, enfants et renvois, recalculés à partir des titres.

Cela a un bel avantage pour l'audit : l'extension n'aurait rien à stocker. Tout l'état vit dans claude.ai, dans les titres et les messages, et l'extension ne fait que le lire et l'afficher. Un « Zettelbranch » se lirait encore correctement le jour où l'extension n'existerait plus, comme le fichier de Luhmann reste lisible sans Luhmann.

## 37 · Pascal

De quels outils aurais-tu besoin pour développer ça ? Je travaille sur d'autres projets en parallèle et j'ai besoin de mon écran.

## 38 · Claude

Bonne nouvelle : presque tout peut se faire sans toucher à votre écran. Voici ce qu'il faudrait, du plus au moins indispensable.

**Pour écrire le code et le tester : un environnement de développement.** Ici, j'ai déjà un conteneur Linux où je peux écrire l'extension, la tester avec un DOM simulé (jsdom) et vous livrer une archive prête à charger. Mais pour un vrai projet avec dépôt Git, itérations et tests, Claude Code est plus adapté : il travaille directement dans votre repo, et peut tourner en arrière-plan ou dans une session dans le cloud, donc sans occuper votre écran. Vous lui confiez une tâche et revenez voir le résultat quand vous voulez.

**Pour connaître la vraie structure de claude.ai : des instantanés de pages.** C'est la seule chose que je ne peux pas obtenir seul, car claude.ai est derrière votre connexion et inaccessible depuis mon environnement. Il me faudrait deux ou trois pages enregistrées via Ctrl+S (une conversation simple, une conversation avec une branche éditée, la liste des conversations). Deux minutes pour vous, et je pourrais ensuite écrire et tester l'extraction des messages entièrement hors ligne. Il faudra aussi vérifier tôt un point de conception : la barre latérale n'affiche que les conversations récentes, donc utiliser les titres comme registre de l'arbre pourrait demander de passer par la recherche ou la page de liste complète.

**Pour l'essai final : vous, une fois par version.** Charger une extension non empaquetée demande une action manuelle dans `chrome://extensions` (ou `about:debugging` sous Firefox), que je ne peux pas faire à votre place. Claude in Chrome, qui est connecté ici, pourrait ensuite piloter les tests dans un groupe d'onglets séparé, mais il travaille dans votre propre navigateur et votre session ; je le garderais pour des vérifications ponctuelles plutôt que pour le développement courant.

En pratique, le bon découpage serait : vous me donnez les instantanés, Claude Code écrit et teste en arrière-plan, et vous ne prenez la main que pour charger chaque version et l'essayer.

[tool use: show_recommendation_cards, left out]

[tool result: show_recommendation_cards, left out]

Quand vous serez prêt à lancer le projet, commencez par les instantanés de pages : c'est ce qui débloque tout le reste.

## 39 · Pascal

Donc tu serais capable de travailler de façon relativement autonome là-dessus ? Une fois que je t'ai donné accès à une extension sous Firefox ou Chrome ?

## 40 · Claude

Oui, en grande partie, avec quelques limites qu'il vaut mieux connaître d'avance.

**Ce qui peut être vraiment autonome**, c'est la boucle écrire → tester → corriger. Avec Claude Code dans votre repo, et les instantanés de pages pour l'extraction hors ligne, je peux enchaîner de longues séries de modifications et de tests sans vous solliciter. On peut même aller plus loin pour les tests sur le vrai claude.ai : Claude Code peut lancer un navigateur dédié via Playwright (Chromium) ou `web-ext run` (Firefox), avec l'extension chargée automatiquement et rechargée à chaque modification, éventuellement sans fenêtre visible. Il suffit que vous vous connectiez une fois à claude.ai dans ce profil de test, et votre navigateur habituel n'est jamais touché.

**Ce qui restera entre vos mains :**

L'installation dans votre navigateur principal. Que ce soit via `chrome://extensions` ou `about:debugging`, c'est une action manuelle que je ne fais pas, et pour une extension qui lit vos conversations, c'est bien que ce soit vous qui la fassiez, en connaissance de cause.

Les tests sur votre compte. Tester le branchement signifie créer de vraies conversations et renommer des titres sur votre compte, ce qui consomme aussi votre quota d'utilisation. Je vous demanderais votre accord sur le principe, et je proposerais de travailler dans un projet claude.ai dédié aux tests pour ne pas encombrer votre liste.

Les blocages éventuels. Si claude.ai affiche une vérification anti-robot face au navigateur automatisé, je ne la contourne pas : je m'arrête et je vous la signale.

**Une précision sur le cadre.** Ici, dans le chat, je ne travaille que pendant mes réponses : je ne peux pas continuer pendant que vous êtes sur autre chose. C'est pour ça que Claude Code est le bon outil pour ce projet : il peut mener une tâche longue de bout en bout, et vous n'intervenez qu'aux points de décision. Quant à Claude in Chrome, je le réserverais aux vérifications ponctuelles, puisqu'il agit dans votre navigateur et votre session.

## 41 · Pascal

Donc il faudrait qu'il prépare une Transmission d'informations pour Claude Code.

## 42 · Claude

[tool use: memory_read, left out]

[tool result: memory_read, left out]

[tool use: create_file, left out]

[tool result: create_file, left out]

[tool use: present_files, left out]

[tool result: present_files, left out]

J'ai préparé la transmission sous forme d'un fichier `CLAUDE.md` : c'est le fichier que Claude Code lit automatiquement au démarrage de chaque session quand il est à la racine d'un dépôt. Il suffit donc de créer le repo, d'y déposer ce fichier, et Claude Code aura tout le contexte de notre discussion.

Il reprend ce que nous avons décidé : le principe des branches comme nouvelles conversations, les adresses à la Luhmann dans les titres, l'en-tête dans le premier message, le bandeau de voisinage, le déclenchement depuis l'application par un lien, et les exigences d'audit. J'y ai aussi mis les erreurs de l'extension existante à ne pas reproduire, les risques techniques à vérifier tôt, et un cadre de travail qui respecte vos contraintes : tests dans un profil de navigateur séparé, uniquement dans un projet claude.ai dédié, arrêt en cas de vérification anti-robot.

Je l'ai rédigé en anglais, puisque le dépôt sera sans doute public comme vos autres projets ; je peux le traduire si vous préférez. Le premier jalon proposé est volontairement modeste : une extraction fiable des messages et un bouton « brancher ici » avec aperçu. La première chose à faire de votre côté sera de fournir les instantanés de pages.

## 43 · Pascal

Tu m'expliquer ce qu'il y a derrière ta notation 1b1

## 44 · Claude

C'est le système d'adressage de Luhmann. L'idée est simple : chaque adresse décrit le chemin depuis la racine, en alternant chiffres et lettres pour marquer chaque niveau de profondeur.

Prenons 1b1 et lisons-le segment par segment. `1` est la fiche de départ. `b` signifie « deuxième branche partant de 1 » (la première étant `a`). Le `1` final signifie « première branche partant de 1b ». Donc 1b1 est la première sous-branche de la deuxième branche de la fiche 1. Dans notre dessin : 1 est votre question initiale sur le branchement, 1b la branche Perec (1a étant celle des extensions), et 1b1 le Zettelkasten, premier développement de la branche Perec.

L'alternance chiffres/lettres n'a pas d'autre rôle que de servir de séparateur implicite : on voit où finit un niveau sans avoir besoin de points ou de barres. 1b1a se lit sans ambiguïté comme 1 › b › 1 › a, quatre niveaux de profondeur.

Cette notation a quelques propriétés très pratiques, qui expliquent pourquoi Luhmann l'a choisie :

On lit la généalogie dans l'adresse. Le parent de 1b1a s'obtient en retirant le dernier segment (1b1), et ainsi de suite jusqu'à la racine. Pas besoin de stocker l'arbre ailleurs.

Les sœurs se reconnaissent immédiatement. 1b1a et 1b1b ont le même parent ; ce sont deux alternatives au même point, comme nos deux noms Zettelbranch et Zettelzweig.

On peut insérer sans jamais renuméroter. Une nouvelle idée qui part de 1a devient 1a3 s'il existe déjà 1a1 et 1a2, et rien d'autre ne bouge. C'est ce qui permettait à Luhmann de faire grandir son fichier pendant des décennies.

Le tri suit l'arbre. En classant les adresses dans l'ordre, on parcourt l'arbre branche par branche, chaque fiche suivie de ses descendants. C'est exactement l'ordre physique des fiches dans sa boîte.

Une nuance par rapport à l'usage original : chez Luhmann, passer de 1 à 2 signifiait souvent « je continue le même fil », tandis qu'ajouter une lettre signifiait « je fais un détour ». Pour Zettelbranch, il serait plus simple de réserver les numéros de premier niveau (1, 2, 3…) aux arbres indépendants, et de considérer tout le reste comme des branches. Il faudra aussi décider ce qui se passe après la 26e lettre, mais une fiche qui a plus de 26 branches directes est sans doute le signe qu'il faut réorganiser.
