/** Scripted Claire assistant for the family profile wizard. */

export type ProfileStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type AssistantTurn = {
  from: "claire" | "family";
  body: string;
};

const OPENERS: Record<ProfileStepIndex, string> = {
  0: "Bonjour. Commençons par les renseignements de base sur votre proche. Quel est son nom complet et sa date de naissance ?",
  1: "Parlons des personnes-ressources. Qui est le contact principal, et quel est son lien avec la personne ?",
  2: "Au sujet du statut légal : y a-t-il un mandat de protection ou une procuration en vigueur ?",
  3: "Passons aux assurances. A-t-elle une assurance privée en plus de la RAMQ ?",
  4: "Pour les finances, quel est le budget mensuel que vous envisagez pour la résidence ?",
  5: "Parlons des soins. Sur une échelle de 1 à 10, où situez-vous son autonomie (1 = très peu autonome) ?",
  6: "Maintenant, vos critères de recherche : secteur, budget, taille, et ce qui compte le plus pour vous.",
  7: "Nous y sommes presque. Souhaitez-vous que je vérifie le récapitulatif avant la signature ?",
};

const SUGGESTIONS: Record<ProfileStepIndex, string[]> = {
  0: ["Je préfère dicter plus tard", "Elle est à l'hôpital", "Passer à l'étape suivante"],
  1: ["Moi, contact principal", "Ajouter un second contact", "Passer à l'étape suivante"],
  2: ["Oui, mandat de protection", "Procuration seulement", "Je dois vérifier"],
  3: ["Oui, assurance privée", "Seulement la RAMQ", "Je ne sais pas"],
  4: ["Environ 3 400 $", "Jusqu'à 3 700 $", "Flexible selon les services"],
  5: ["Autonomie autour de 4/10", "Elle marche avec une canne", "Fauteuil roulant"],
  6: ["Priorité aux soins", "Proche de Sillery", "Budget max 3500 $"],
  7: ["Oui, vérifie pour moi", "Tout est prêt", "Revenir à une étape"],
};

function replyFor(step: ProfileStepIndex, message: string): string {
  const m = message.toLowerCase();
  if (step === 0) {
    if (m.includes("hôpital") || m.includes("hopital")) {
      return "J'ai noté hôpital et marqué le dossier comme urgent. Les résidences le verront en priorité. Pouvons-nous confirmer sa date de naissance ?";
    }
    return "Merci. J'ai noté ces renseignements dans l'étape Demandeur. Dites-moi s'il manque quelque chose.";
  }
  if (step === 1) {
    return "C'est noté dans Contacts. Nous pourrons compléter les téléphones et courriels juste après.";
  }
  if (step === 2) {
    if (m.includes("mandat")) {
      return "J'ai coché « mandat de protection ». Ajoutez le nom du mandataire quand vous l'avez sous la main.";
    }
    return "Statut légal mis à jour. Vous pourrez joindre le document dans Notre dossier.";
  }
  if (step === 3) {
    return "Assurances mises à jour. Si une police manque, la résidence pourra quand même ouvrir le dossier.";
  }
  if (step === 4) {
    if (m.includes("3 400") || m.includes("3400") || m.includes("3 700")) {
      return "J'ai inscrit le budget mensuel. Cela m'aidera à suggérer des résidences adaptées.";
    }
    return "Finances notées. Nous pourrons ajuster le mode de paiement plus tard.";
  }
  if (step === 5) {
    if (m.includes("/10") || m.includes("autonomie")) {
      return "J'ai noté le niveau d'autonomie. Il servira au matching avec les catégories RPA.";
    }
    if (m.includes("canne")) {
      return "J'ai noté la mobilité avec canne et l'aide à la marche. Passons aux repas et à la médication si vous voulez.";
    }
    if (m.includes("fauteuil")) {
      return "J'ai inscrit fauteuil roulant. Les résidences verront le besoin d'accessibilité.";
    }
    return "Soins mis à jour. Signalez aussi allergies et mémoire si c'est pertinent.";
  }
  if (step === 6) {
    if (m.includes("soin")) {
      return "Priorité soins renforcée. Le score favorisera l'adéquation autonomie / catégories RPA.";
    }
    if (m.includes("budget") || m.includes("3500") || m.includes("3 500")) {
      return "Budget de recherche noté. Il ne scorera que si un tarif est connu pour la résidence.";
    }
    return "Critères de recherche mis à jour. Vous pouvez ajuster les curseurs de priorité à tout moment.";
  }
  return "Récapitulatif prêt. Quand vous serez à l'aise, cochez le consentement et signez à l'étape Signature.";
}

/** Stub interface for a future real model. */
export async function askAssistant(step: number, message: string): Promise<string> {
  const s = Math.min(7, Math.max(0, step)) as ProfileStepIndex;
  await new Promise((r) => setTimeout(r, 180));
  return replyFor(s, message);
}

export function assistantOpener(step: number): string {
  const s = Math.min(7, Math.max(0, step)) as ProfileStepIndex;
  return OPENERS[s];
}

export function assistantSuggestions(step: number): string[] {
  const s = Math.min(7, Math.max(0, step)) as ProfileStepIndex;
  return SUGGESTIONS[s];
}
