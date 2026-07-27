export type Locale = "en" | "fr";

/** French strings keyed by English source text. Missing keys fall back to English. */
export const frMessages: Record<string, string> = {
  // Language switcher
  Language: "Langue",
  English: "Anglais",
  French: "Français",
  "Switch to French": "Passer en français",
  "Switch to English": "Passer en anglais",

  // Common chrome
  "Log in": "Connexion",
  Register: "S’inscrire",
  "Sign out": "Se déconnecter",
  "Sign in": "Connexion",
  Assistant: "Assistant",
  "Close menu": "Fermer le menu",
  "Open menu": "Ouvrir le menu",
  "Navigation menu": "Menu de navigation",
  "Toggle theme": "Changer le thème",
  "Light mode": "Mode clair",
  "Dark mode": "Mode sombre",
  "Account menu": "Menu du compte",
  Explore: "Explorer",
  "Get started": "Commencer",
  Trust: "Confiance",
  Privacy: "Confidentialité",
  Security: "Sécurité",
  Accessibility: "Accessibilité",
  "Community sign-in": "Espace établissements",
  "Internal admin": "Admin interne",
  "Senior living admissions, made clear.":
    "Les admissions en résidence, rendues claires.",

  // Portal badges
  "Care professional": "Professionnel de santé",
  "Family portal": "Espace famille",
  "Verification pending": "Vérification en cours",
  Admissions: "Admissions",

  // Public nav
  Home: "Accueil",
  "Find Senior Living": "Trouver une résidence",
  "For Families": "Pour les familles",
  "For Communities": "Pour les établissements",
  Contact: "Contact",

  // Family nav
  Dashboard: "Tableau de bord",
  Profile: "Profil",
  Communities: "Établissements",
  "My applications": "Mes candidatures",
  "Manage profile": "Gérer le profil",
  Documents: "Documents",
  "Browse communities": "Parcourir les établissements",
  Saved: "Enregistrées",
  Compare: "Comparer",
  Messages: "Messages",
  Account: "Compte",
  Notifications: "Notifications",
  "Family members": "Membres de la famille",
  "Privacy & security": "Confidentialité et sécurité",
  Settings: "Paramètres",

  // Community nav
  Transition: "Transition",
  History: "Historique",
  Community: "Établissement",
  Team: "Équipe",

  // Professional nav
  Patients: "Patients",
  Applications: "Candidatures",
  Contacts: "Contacts",
  "My Organization": "Mon organisation",

  // Internal nav
  Overview: "Vue d’ensemble",
  Users: "Utilisateurs",
  Families: "Familles",
  Seniors: "Aînés",
  Reports: "Rapports",
  Content: "Contenu",
  "Audit Logs": "Journaux d’audit",
  Analytics: "Analytique",
  People: "Personnes",
  Operations: "Opérations",
  Governance: "Gouvernance",
  Moderation: "Modération",
  "Audit logs": "Journaux d’audit",

  // Home hero
  "One profile. Multiple communities. Less paperwork.":
    "Un profil. Plusieurs établissements. Moins de paperasse.",
  "Create one secure profile for your loved one, upload medical documents, apply to several senior living communities, and follow every application from one calm place.":
    "Créez un profil sécurisé pour votre proche, ajoutez les documents médicaux, postulez dans plusieurs établissements, et suivez chaque dossier au même endroit.",
  "Build your profile": "Créer votre profil",
  "Find senior living": "Trouver une résidence",
  "One profile for every application": "Un profil pour chaque candidature",
  "Secure medical document vault": "Coffre-fort de documents médicaux",
  "Apply to multiple communities": "Postuler dans plusieurs établissements",
  "Family caregiver supporting a senior parent":
    "Aidant familial auprès d’un parent aîné",
  "Your loved one’s profile": "Le profil de votre proche",
  "Built once · Ready to reuse": "Créé une fois · Réutilisable",

  // Home sections
  "Everything families need in one place.":
    "Tout ce dont les familles ont besoin, au même endroit.",
  "When you’re helping a parent, the last thing you need is another maze of forms and folders.":
    "Quand vous aidez un parent, le dernier besoin est un labyrinthe de formulaires et de dossiers.",
  "Care profile": "Profil de soins",
  "Ready to share when you are": "Prêt à partager quand vous l’êtes",
  Complete: "Complet",
  "In your vault": "Dans votre coffre",
  "In progress": "En cours",
  "Where things stand": "Où en sont les choses",
  "Waiting review": "En attente d’examen",
  "Assessment requested": "Évaluation demandée",
  "Tour scheduled": "Visite planifiée",
  "Build a complete care profile": "Construire un profil de soins complet",
  "Upload records or answer guided questions. Haven organizes everything into a clear profile you review before sharing.":
    "Téléversez des dossiers ou répondez à des questions guidées. Haven organise le tout dans un profil clair que vous validez avant de partager.",
  "Keep documents organized": "Garder les documents organisés",
  "Medication lists, insurance, diagnoses, assessments, and emergency contacts, no more searching through emails and PDFs.":
    "Listes de médicaments, assurances, diagnostics, évaluations et contacts d’urgence, plus besoin de fouiller dans les courriels et PDF.",
  "Complete your profile once. Reuse it anywhere. No duplicate paperwork.":
    "Complétez le profil une fois, réutilisez-le partout, sans ressaisir les mêmes informations.",
  "Track every application": "Suivre chaque candidature",
  "See where each application stands, waiting review, assessment requested, more information needed, tour scheduled, or accepted.":
    "Voyez où en est chaque candidature : en examen, évaluation demandée, infos manquantes, visite planifiée ou acceptée.",
  "Find communities that fit your family’s needs.":
    "Trouvez des établissements adaptés aux besoins de votre famille.",
  "Search by care type, budget, distance, insurance, and availability, so you spend less time guessing and more time comparing what matters.":
    "Cherchez par type de soins, budget, distance, assurance et disponibilité, pour comparer ce qui compte vraiment.",
  "Near home · Assisted living · Within budget":
    "Près de chez vous · Vie assistée · Dans le budget",
  "Care type": "Type de soins",
  Budget: "Budget",
  Distance: "Distance",
  Insurance: "Assurance",
  Availability: "Disponibilité",
  "Senior living community setting": "Cadre d’une résidence pour aînés",
  "Communities near your family": "Établissements près de chez vous",
  "Senior living": "Résidence pour aînés",
  "Care offered · Pricing · Admission needs · Availability":
    "Soins offerts · Tarifs · Besoins d’admission · Disponibilité",
  "Your medical records become a living profile.":
    "Vos dossiers médicaux deviennent un profil vivant.",
  "Simply upload the documents you already have. Haven gently organizes medications, diagnoses, physicians, care needs, and insurance into fields you can edit.":
    "Téléversez simplement les documents que vous avez déjà. Haven organise médicaments, diagnostics, médecins, besoins de soins et assurance dans des champs modifiables.",
  "Nothing is shared until you review it. You stay in control of every detail.":
    "Rien n’est partagé avant votre validation. Vous gardez le contrôle de chaque détail.",
  "Medications and diagnoses, clearly listed":
    "Médicaments et diagnostics, clairement listés",
  "Physicians and care needs in one view":
    "Médecins et besoins de soins en un coup d’œil",
  "Insurance details ready when communities ask":
    "Coordonnées d’assurance prêtes quand l’établissement les demande",
  "Everything editable before you send an application":
    "Tout est modifiable avant d’envoyer une candidature",
  "Profile details": "Détails du profil",
  "Ready to review": "Prêt à réviser",
  Verified: "Vérifié",
  "Confidence cues help you review, your confirmation is what matters.":
    "Des indices vous aident à réviser, votre confirmation reste essentielle.",
  "Built for everyone involved.": "Conçu pour toutes les personnes impliquées.",
  "Families, care teams, and communities can finally work from the same clear picture.":
    "Familles, équipes de soins et établissements partagent enfin la même vision claire.",
  "Create one application": "Créer une candidature unique",
  "Stay informed": "Rester informé",
  "Collaborate with siblings": "Collaborer avec la fratrie",
  "Hospitals & social workers": "Hôpitaux et travailleurs sociaux",
  "Prepare referrals faster": "Préparer les références plus vite",
  "Avoid duplicate paperwork": "Éviter la paperasse en double",
  "Track every placement": "Suivre chaque placement",
  "Senior living communities": "Établissements pour aînés",
  "Receive complete applications": "Recevoir des dossiers complets",
  "Review organized medical information":
    "Examiner l’information médicale organisée",
  "Request more details in one conversation":
    "Demander plus de détails dans une même conversation",
  "The admissions journey, made clearer.":
    "Le parcours d’admission, rendu plus clair.",
  "From the first conversation to moving day, one path you can follow together.":
    "De la première conversation au jour d’emménagement, un parcours à suivre ensemble.",
  "Create profile": "Créer le profil",
  "Find communities": "Trouver des établissements",
  "Submit applications": "Soumettre les candidatures",
  "Complete assessments": "Compléter les évaluations",
  "Receive decisions": "Recevoir les décisions",
  "Move in": "Emménager",
  "Your information stays under your control.":
    "Vos informations restent sous votre contrôle.",
  "Families decide exactly who receives their information.":
    "Les familles décident exactement qui reçoit leurs informations.",
  "Medical records are only shared after explicit consent.":
    "Les dossiers médicaux ne sont partagés qu’après un consentement explicite.",
  "Documents remain securely stored for the people you trust.":
    "Les documents restent stockés en sécurité pour les personnes de confiance.",
  "Encrypted storage": "Stockage chiffré",
  "Consent tracking": "Suivi du consentement",
  "Audit history": "Historique d’audit",
  "Share only what you choose": "Ne partagez que ce que vous choisissez",
  "Less stress. Clearer communication.":
    "Moins de stress. Une communication plus claire.",
  "We applied to five homes in one evening. Haven made the hardest week of our lives feel manageable.":
    "Nous avons postulé dans cinq résidences en une soirée. Haven a rendu gérable la semaine la plus difficile de notre vie.",
  "Daughter · Family": "Fille · Famille",
  "I spend less time chasing documents and more time helping families. Referrals move faster when the profile is already complete.":
    "Je passe moins de temps à courir après les documents et plus de temps à aider les familles. Les références avancent plus vite quand le profil est déjà complet.",
  "Hospital social worker": "Travailleur social hospitalier",
  "We finally see the full medical picture on day one, and can ask for what we need without endless email chains.":
    "Nous voyons enfin le portrait médical complet dès le premier jour, et pouvons demander ce qu’il faut sans chaînes de courriels sans fin.",
  "Residence administrator": "Administrateur de résidence",
  "Questions families ask": "Questions que se posent les familles",
  "Can I apply to multiple communities?":
    "Puis-je postuler dans plusieurs établissements ?",
  "Yes. Build your loved one’s profile once, then send it to as many communities as you need, without starting over each time.":
    "Oui. Créez le profil de votre proche une seule fois, puis envoyez-le aux établissements de votre choix, sans recommencer à chaque fois.",
  "Do I need every document before I start?":
    "Ai-je besoin de tous les documents avant de commencer ?",
  "No. Begin with what you have. You can upload records and fill in details gradually as you gather them.":
    "Non. Commencez avec ce que vous avez. Vous pouvez ajouter des dossiers et compléter les détails au fur et à mesure.",
  "Can my siblings help manage the application?":
    "Mes frères et sœurs peuvent-ils aider à gérer la candidature ?",
  "Yes. Invite family members to share the same profile so everyone stays informed and can help when needed.":
    "Oui. Invitez des membres de la famille à partager le même profil pour que chacun reste informé et puisse aider.",
  "Can a hospital social worker submit an application?":
    "Un travailleur social hospitalier peut-il soumettre une candidature ?",
  "Yes. Care professionals can prepare and submit applications on behalf of patients, then keep everyone updated in one place.":
    "Oui. Les professionnels de santé peuvent préparer et soumettre des candidatures au nom des patients, puis tenir tout le monde informé au même endroit.",
  "How is my medical information protected?":
    "Comment mes informations médicales sont-elles protégées ?",
  "You decide who receives your information. Medical records are only shared after you give explicit consent for each application.":
    "Vous décidez qui reçoit vos informations. Les dossiers médicaux ne sont partagés qu’après votre consentement explicite pour chaque candidature.",
  "Ready to make senior living admissions simpler?":
    "Prêt à simplifier les admissions en résidence ?",
  "Build one secure profile. Apply with confidence. Track every admission from one place.":
    "Créez un profil sécurisé. Postulez en confiance. Suivez chaque admission au même endroit.",
  "Start your application": "Commencer votre candidature",

  // Find senior living
  "Search by postal code, city, or name, then refine by care type, budget, and distance.":
    "Cherchez par code postal, ville ou nom, puis affinez par type de soins, budget et distance.",
  "Build a profile": "Créer un profil",
  "Browse freely, build a profile for better matches":
    "Parcourez librement, créez un profil pour de meilleures suggestions",
  "You can explore communities by postal code and filters right now. Create a short profile so Haven can suggest the best residences for your loved one’s care needs, budget, and preferred area.":
    "Explorez dès maintenant les établissements par code postal et filtres. Créez un court profil pour que Haven vous propose les résidences les mieux adaptées aux besoins, au budget et au secteur souhaité.",
  'Ask Haven: "within 20 miles of Boston under $7,000"':
    "Demandez à Haven : « dans un rayon de 20 km autour de Montréal sous 7 000 $ »",
  Apply: "Appliquer",
  "Postal / ZIP": "Code postal",
  "Postal or ZIP code": "Code postal",
  "Clear postal code": "Effacer le code postal",
  "City, community name, or keyword": "Ville, nom d’établissement ou mot-clé",
  Search: "Recherche",
  "Clear search": "Effacer la recherche",
  Filters: "Filtres",
  List: "Liste",
  Map: "Carte",
  "Showing communities near {label}": "Établissements près de {label}",
  " · within {miles} miles": " · dans un rayon de {miles} mi",
  " Build a profile to rank these by care fit.":
    " Créez un profil pour classer selon l’adéquation des soins.",
  "We couldn’t pinpoint that postal code yet, try a nearby ZIP (e.g. 78731) or add a city name.":
    "Nous n’avons pas encore pu localiser ce code postal, essayez un code voisin (ex. 78731) ou ajoutez une ville.",
  "Postal / ZIP code": "Code postal",
  "e.g. 78731": "ex. 78731",
  "Monthly budget max": "Budget mensuel max",
  Any: "Tous",
  "Under $3,500": "Moins de 3 500 $",
  "Under $4,500": "Moins de 4 500 $",
  "Under $5,500": "Moins de 5 500 $",
  "Under $7,000": "Moins de 7 000 $",
  "Max distance": "Distance max",
  "5 mi": "5 mi",
  "10 mi": "10 mi",
  "25 mi": "25 mi",
  "50 mi": "50 mi",
  "Assisted living": "Vie assistée",
  "Memory care": "Soins de la mémoire",
  "Nursing care": "Soins infirmiers",
  "Independent living": "Vie autonome",
  Rehabilitation: "Réadaptation",
  "Respite care": "Soins de répit",
  CCRC: "CCRC",
  "Clear filters": "Effacer les filtres",
  "Update care needs": "Mettre à jour les besoins de soins",
  "Build a profile for better matches":
    "Créer un profil pour de meilleures suggestions",
  "No communities found": "Aucun établissement trouvé",
  "Filters look too restrictive": "Les filtres semblent trop restrictifs",
  "Try removing a few requirements, especially budget, distance, and Medicaid together, or broaden care type.":
    "Essayez d’assouplir quelques critères, surtout budget, distance et Medicaid ensemble, ou élargissez le type de soins.",
  "Try another city, ZIP, or community name. You can also clear filters to browse the full demo list.":
    "Essayez une autre ville, un autre code postal ou un autre nom. Vous pouvez aussi effacer les filtres pour parcourir toute la liste démo.",
  "{count} community": "{count} établissement",
  "{count} communities": "{count} établissements",
  " match your search": " correspondent à votre recherche",
  "Loading search…": "Chargement de la recherche…",
  "Loading… {visible} of {total}": "Chargement… {visible} sur {total}",
  "{count} selected to compare": "{count} sélectionnées pour comparer",
  Partners: "Partenaires",
  "Partners only": "Partenaires seulement",
  "Immediate availability": "Disponibilité immédiate",
  "Couples welcome": "Couples bienvenus",
  "Temporary / respite": "Temporaire / répit",
  Transport: "Transport",
  "Specialized meals": "Repas spécialisés",
  Amenities: "Commodités",
  Pets: "Animaux",
  "Medical services": "Services médicaux",
  Veterans: "Anciens combattants",
  Medicaid: "Medicaid",
  "Secure memory care": "Unité mémoire sécurisée",
  "Rating 4.5+": "Note 4,5+",
  "Rating 4.0+": "Note 4,0+",

  // For families
  "For families": "Pour les familles",
  "Secure document storage": "Documents conservés en sécurité",
  "One shared family profile": "Un profil familial partagé",
  "Private application updates": "Suivi privé de chaque dossier",
  Create: "Créer",
  Discover: "Découvrir",
  "Build a care profile for yourself or a loved one, with AI help or step-by-step forms.":
    "Créez un profil de soins pour vous ou un proche, avec l’aide de l’IA ou des formulaires guidés.",
  "Find and compare communities that match the care needs.":
    "Trouvez et comparez les établissements qui correspondent aux besoins de soins.",
  "Review the application and send it in one or two clicks.":
    "Relisez le dossier et envoyez-le en un ou deux clics.",
  "Family dashboard": "Espace famille",
  "Paul’s journey": "Le parcours de Paul",
  "72% ready": "Prêt à 72 %",
  "Senior profile": "Profil de l’aîné",
  "Paul Gilbert · Assisted living": "Paul Gilbert · Vie assistée",
  "2 still useful": "2 encore utiles",
  "Updated today": "Mis à jour aujourd’hui",
  "Under review": "En examen",
  "Docs requested": "Documents demandés",
  "A simpler way to find the right senior living community":
    "Une façon plus simple de trouver le bon établissement",
  "Haven lets your family create one shared profile, compare communities, and send multiple applications without filling the same forms again.":
    "Haven permet à votre famille de créer un profil partagé, de comparer des établissements et d’envoyer plusieurs dossiers sans remplir les mêmes formulaires à chaque fois.",
  "One profile. Multiple applications. Your family stays in control.":
    "Un profil. Plusieurs dossiers. Votre famille garde le contrôle.",
  "Keep everyone in the family aligned": "Gardez toute la famille alignée",
  "Invite siblings, caregivers or trusted relatives to help complete the profile and follow the applications. Choose what each person can view or edit.":
    "Invitez frères, sœurs, aidants ou proches de confiance pour compléter le profil et suivre les dossiers. Vous choisissez ce que chacun peut voir ou modifier.",
  "Shared visibility": "Visibilité partagée",
  "Controlled access": "Accès contrôlé",
  "No more forwarded email threads": "Fini les chaînes de courriels",
  "Family access": "Accès famille",
  Invite: "Inviter",
  "Full access": "Accès complet",
  "Can edit profile": "Peut modifier le profil",
  "View only": "Lecture seule",
  "(you)": "(vous)",
  Owner: "Propriétaire",
  Guest: "Invité",
  "Each application stays private": "Chaque dossier reste confidentiel",
  "Every community only sees the information and documents you choose to send to them. Acceptances, waitlists and declines remain separate.":
    "Chaque établissement ne voit que les informations et documents que vous choisissez de lui transmettre. Acceptations, listes d’attente et refus restent séparés.",
  "Private thread": "Échange privé",
  "Offer received": "Offre reçue",
  "Three steps. Clear progress.": "Trois étapes. Une progression claire.",
  "Ready to make the search easier?": "Prêt à simplifier votre recherche ?",
  "Create one family profile and start exploring senior living communities with more clarity.":
    "Créez un profil famille et explorez les établissements avec plus de clarté.",
  "Explore senior living communities": "Explorer les établissements",
  "Free to create a profile. No application is sent without your approval.":
    "Créer un profil est gratuit. Aucun dossier n’est envoyé sans votre accord.",
  "Also see": "Voir aussi",

  // For communities / establishments
  "For communities": "Pour les établissements",
  "Complete digital applications": "Dossiers numériques complets",
  "Documents in one packet": "Tous les documents au même endroit",
  "Messaging on the application": "Messagerie liée au dossier",
  "Clear accept / decline trail": "Historique clair d’acceptation ou de refus",
  Receive: "Recevoir",
  Review: "Examiner",
  Decide: "Décider",
  "Get a structured admission packet with profile, care needs, and shared documents.":
    "Recevez un dossier d’admission structuré : profil, besoins de soins et documents partagés.",
  "Read the file, request what’s missing, message the family, and propose a tour.":
    "Consultez le dossier, demandez ce qui manque, écrivez à la famille et proposez une visite.",
  "Accept, decline, or wait for information, the family is notified automatically.":
    "Acceptez, refusez ou attendez des renseignements : la famille est avisée automatiquement.",
  "Admissions inbox": "Boîte d’admissions",
  "4 need attention": "4 à traiter",
  New: "Nouveau",
  "In review": "En examen",
  "Need info": "Infos manquantes",
  "Incoming packets": "Dossiers reçus",
  Today: "Aujourd’hui",
  "Assisted living · 6 documents": "Vie assistée · 6 documents",
  "Memory care · Docs shared": "Soins de la mémoire · Documents partagés",
  "Physician report missing": "Rapport médical manquant",
  "Decision ready": "Décision prête",
  "Accept, decline, or request information, the family is notified in Haven.":
    "Acceptez, refusez ou demandez des renseignements : la famille est avisée dans Haven.",
  "A simpler way to receive and review senior living applications":
    "Une façon plus simple de recevoir et d’examiner les dossiers d’admission",
  "Haven is an admissions channel, not occupancy software. Families send complete digital packets. Your team reviews, messages, and decides in one place.":
    "Haven est un canal d’admissions, pas un logiciel d’occupation. Les familles envoient des dossiers numériques complets. Votre équipe les examine, échange et décide au même endroit.",
  "Create a community account": "Créer un compte établissement",
  "Receive. Review. Respond. Nothing else.":
    "Recevoir. Examiner. Répondre. Rien de plus.",
  "Keep your admissions team aligned": "Alignez votre équipe d’admissions",
  "Invite directors, coordinators, or site leads to review applications together. Internal notes stay private to your team. Families only see what you send.":
    "Invitez directions, coordonnateurs ou responsables de site à examiner les dossiers ensemble. Les notes internes restent privées. Les familles ne voient que ce que vous leur envoyez.",
  "Shared inbox": "Boîte partagée",
  "Role-based access": "Accès selon le rôle",
  "Notes stay internal": "Notes réservées à l’équipe",
  "Admissions team": "Équipe d’admissions",
  "Director of Admissions": "Direction des admissions",
  "Can review & decide": "Peut examiner et décider",
  "View & message": "Lecture et messagerie",
  Admin: "Admin",
  Member: "Membre",
  "Every application arrives complete": "Chaque dossier arrive complet",
  "No more scattered emails or incomplete PDFs. Each packet includes the senior profile, care context, and the documents the family chose to share, ready to review.":
    "Fini les courriels épars et les PDF incomplets. Chaque dossier regroupe le profil, le contexte de soins et les documents que la famille a choisi de partager, prêts à examiner.",
  "Care needs included": "Besoins de soins inclus",
  "Attached & shared": "Joints et partagés",
  "Your copy only": "Votre copie seulement",
  "Not visible to others": "Invisible aux autres établissements",
  "Three steps. Clear admissions.": "Trois étapes. Des admissions plus claires.",
  "Ready to simplify admissions?": "Prêt à simplifier les admissions ?",
  "Create a community account and start receiving complete applications in one organized inbox.":
    "Créez un compte établissement et recevez des dossiers complets dans une boîte organisée.",
  "Sign in to your portal": "Se connecter à votre portail",
  "Focused on admissions only. No occupancy or resident management tools.":
    "Axé uniquement sur les admissions. Sans outils d’occupation ni de gestion des résidents.",

  // Contact
  "Tell us how we can help": "Dites-nous comment nous pouvons aider",
  "I’m a family": "Je suis une famille",
  "I’m a community": "Je représente un établissement",
  "Something else": "Autre chose",
  Name: "Nom",
  Email: "Courriel",
  Message: "Message",
  Send: "Envoyer",
  "Your message was sent.": "Votre message a été envoyé.",
  "Send another message": "Envoyer un autre message",
  "Whether you’re navigating senior living for a loved one or reviewing applications as a community, we’re happy to answer.":
    "Que vous accompagniez un proche vers une résidence, ou que vous gériez des admissions en établissement, nous sommes là pour vous répondre.",
  "Prefer email?": "Vous préférez le courriel ?",
  "We usually reply within one business day.": "Nous répondons généralement en un jour ouvrable.",
  "Quick links": "Liens rapides",
  "How it works": "Comment ça marche",
  "Create a family profile": "Créer un profil famille",

  // Start / profile creation choice
  Welcome: "Bienvenue",
  "Welcome, {name}": "Bienvenue, {name}",
  "How would you like to create the profile?":
    "Comment souhaitez-vous créer le profil ?",
  "For yourself or a loved one. Build it once, then discover communities and apply everywhere with almost no extra work.":
    "Pour vous ou pour un proche. Créez-le une fois, puis trouvez des établissements et postulez partout, presque sans travail supplémentaire.",
  "Chat with Haven": "Discutez avec Haven",
  "Haven asks natural questions and fills the profile for you. Best if you prefer a guided conversation.":
    "Haven pose des questions naturelles et remplit le profil pour vous. Idéal si vous préférez une conversation guidée.",
  "Start with AI": "Commencer avec l’IA",
  "Fill forms yourself": "Remplir les formulaires vous-même",
  "Step-by-step forms if you already know the details and want full control over every field.":
    "Des formulaires étape par étape si vous connaissez déjà les détails et voulez tout contrôler.",
  "Use manual forms": "Utiliser les formulaires",
  "You can switch methods anytime.": "Vous pouvez changer de méthode à tout moment.",
  "Skip to dashboard": "Aller au tableau de bord",

  // Assistant chrome
  "Haven assistant": "Assistant Haven",
  "{done}/{total} sections ready": "{done}/{total} sections prêtes",
  "Haven is typing…": "Haven écrit…",
  "Type your answer…": "Écrivez votre réponse…",
  "Hi, I'm Haven. I'll help you build a care profile, for yourself or someone you love. This usually takes about 15 minutes, and you'll only need to do it once. Who is this profile for?":
    "Bonjour, je suis Haven. Je vais vous aider à créer un profil de soins, pour vous ou pour un proche. Cela prend environ 15 minutes, et vous n’aurez à le faire qu’une fois. Pour qui est ce profil ?",
  Myself: "Pour moi",
  "My mother": "Ma mère",
  "My father": "Mon père",
  "My spouse": "Mon conjoint",

  // Onboarding intro
  "Create a care profile": "Créer un profil de soins",
  "For yourself or a loved one. One calm dossier you can reuse across communities, complete what you know now, add more later.":
    "Pour vous ou pour un proche. Un dossier clair, réutilisable dans plusieurs établissements : complétez ce que vous savez maintenant, ajoutez le reste plus tard.",
  "One profile, many communities": "Un profil, plusieurs établissements",
  "Apply without retyping the same story for every facility.":
    "Postulez sans ressaisir la même histoire pour chaque établissement.",
  "Finish later anytime": "Reprenez plus tard quand vous voulez",
  "Skip optional fields. Autosave keeps your place.":
    "Ignorez les champs optionnels. L’enregistrement automatique garde votre place.",
  "Sensitive data stays private": "Les données sensibles restent privées",
  "Medical and personal details are protected by default.":
    "Les renseignements médicaux et personnels sont protégés par défaut.",
  "You control who sees what": "Vous contrôlez qui voit quoi",
  "Choose which communities receive each part of the dossier.":
    "Choisissez quels établissements reçoivent chaque partie du dossier.",
  Continue: "Continuer",
  Back: "Retour",
  "Save & continue": "Enregistrer et continuer",
  "Who is this for?": "Pour qui est ce profil ?",
  "You can create a profile for yourself, or for someone in your family.":
    "Vous pouvez créer un profil pour vous-même, ou pour un membre de votre famille.",
  "Please complete the required fields below.":
    "Veuillez remplir les champs obligatoires ci-dessous.",
  "Who is filling out this profile?": "Qui remplit ce profil ?",

};

export function translate(locale: Locale, key: string): string {
  if (!key) return key;
  if (locale === "en") return key;
  return frMessages[key] ?? key;
}
