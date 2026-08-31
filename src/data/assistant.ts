/** Scripted Claire assistant for the family profile wizard. */

export type ProfileStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type AssistantTurn = {
  from: "claire" | "family";
  body: string;
};

const OPENERS_PROCHE: Record<ProfileStepIndex, string> = {
  0: "Bonjour. Ce dossier est-il pour vous-même, ou pour un proche que vous accompagnez ?",
  1: "Parfait. Indiquons maintenant le nom et les coordonnées de la personne qui cherche une résidence.",
  2: "Parlons des personnes-ressources. Qui est le contact principal, et quel est son lien avec la personne ?",
  3: "Au sujet du statut légal : y a-t-il un mandat de protection ou une procuration en vigueur ?",
  4: "Passons aux assurances. A-t-elle une assurance privée en plus de la RAMQ ?",
  5: "Pour les finances, quel budget mensuel envisagez-vous pour la résidence ?",
  6: "Parlons des soins. Sur une échelle de 1 à 10, où situez-vous son autonomie ?",
  7: "Maintenant, les critères de recherche : secteur, budget, taille, et vos priorités.",
  8: "Nous y sommes presque. Souhaitez-vous que je vérifie le récapitulatif avant la signature ?",
};

const OPENERS_SELF: Record<ProfileStepIndex, string> = {
  0: "Bonjour. Ce dossier est-il pour vous-même, ou pour un proche que vous accompagnez ?",
  1: "Très bien. Confirmons vos renseignements personnels pour le dossier d’admission.",
  2: "Ajoutons vos personnes-ressources : qui contacter en priorité ?",
  3: "Au sujet du statut légal : avez-vous un mandat de protection ou une procuration ?",
  4: "Passons aux assurances. Avez-vous une assurance privée en plus de la RAMQ ?",
  5: "Pour les finances, quel budget mensuel envisagez-vous pour votre résidence ?",
  6: "Parlons de vos besoins de soins. Sur une échelle de 1 à 10, où situez-vous votre autonomie ?",
  7: "Indiquons vos critères de recherche : secteur, budget, taille, et ce qui compte le plus pour vous.",
  8: "Dernière étape : vérifions le récapitulatif avant de signer.",
};

const SUGGESTIONS: Record<ProfileStepIndex, string[]> = {
  0: ["Pour moi-même", "Pour un proche", "Passer à l'étape suivante"],
  1: ["Je préfère dicter plus tard", "Passer à l'étape suivante"],
  2: ["Moi, contact principal", "Ajouter un second contact", "Passer à l'étape suivante"],
  3: ["Oui, mandat de protection", "Procuration seulement", "Je dois vérifier"],
  4: ["Oui, assurance privée", "Seulement la RAMQ", "Je ne sais pas"],
  5: ["Environ 3 400 $", "Jusqu'à 3 700 $", "Flexible selon les services"],
  6: ["Autonomie autour de 4/10", "Marche avec une canne", "Fauteuil roulant"],
  7: ["Priorité aux soins", "Proche de Sillery", "Budget max 3500 $"],
  8: ["Oui, vérifie pour moi", "Tout est prêt", "Revenir à une étape"],
};

function replyFor(step: ProfileStepIndex, message: string, forSelf: boolean): string {
  const m = message.toLowerCase();
  if (step === 0) {
    if (m.includes("moi") || m.includes("self")) {
      return "Dossier pour vous-même : les prochaines étapes parleront de vos besoins et de votre recherche.";
    }
    if (m.includes("proche") || m.includes("parent") || m.includes("mère") || m.includes("père")) {
      return "Dossier pour un proche : précisez le lien, puis nous remplirons son identité.";
    }
    return "Choisissez « Pour moi-même » ou « Pour un proche » pour adapter le parcours.";
  }
  if (step === 1) {
    return forSelf
      ? "Merci. Vos renseignements d’identité sont notés."
      : "Merci. J’ai noté les renseignements d’identité de la personne.";
  }
  if (step === 2) {
    return "C'est noté dans Contacts. Nous pourrons compléter les téléphones et courriels juste après.";
  }
  if (step === 3) {
    if (m.includes("mandat")) {
      return "J'ai coché « mandat de protection ». Ajoutez le nom du mandataire quand vous l'avez sous la main.";
    }
    return "Statut légal mis à jour. Vous pourrez joindre le document dans Notre dossier.";
  }
  if (step === 4) {
    return "Assurances mises à jour. Si une police manque, la résidence pourra quand même ouvrir le dossier.";
  }
  if (step === 5) {
    if (m.includes("3 400") || m.includes("3400") || m.includes("3 700")) {
      return "J'ai inscrit le budget mensuel. Cela m'aidera à suggérer des résidences adaptées.";
    }
    return "Finances notées. Nous pourrons ajuster le mode de paiement plus tard.";
  }
  if (step === 6) {
    if (m.includes("/10") || m.includes("autonomie")) {
      return "J'ai noté le niveau d'autonomie. Il servira au matching avec les catégories RPA.";
    }
    return "Soins mis à jour. Signalez aussi allergies et mémoire si c'est pertinent.";
  }
  if (step === 7) {
    return "Critères de recherche mis à jour. Vous pouvez ajuster les curseurs de priorité à tout moment.";
  }
  return "Récapitulatif prêt. Quand vous serez à l'aise, cochez le consentement et signez à l'étape Signature.";
}

function clampStep(step: number): ProfileStepIndex {
  return Math.min(8, Math.max(0, step)) as ProfileStepIndex;
}

/** Stub interface for a future real model. */
export async function askAssistant(
  step: number,
  message: string,
  opts?: { forSelf?: boolean },
): Promise<string> {
  const s = clampStep(step);
  await new Promise((r) => setTimeout(r, 180));
  return replyFor(s, message, Boolean(opts?.forSelf));
}

export function assistantOpener(step: number, opts?: { forSelf?: boolean }): string {
  const s = clampStep(step);
  return (opts?.forSelf ? OPENERS_SELF : OPENERS_PROCHE)[s];
}

export function assistantSuggestions(step: number): string[] {
  return SUGGESTIONS[clampStep(step)];
}
