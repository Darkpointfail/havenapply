import { images } from "@/data/images";

export type Message = {
  id: string;
  from: "family" | "residence";
  text: string;
  time: string;
  type?: "text" | "document-request" | "visit" | "admission";
  meta?: string;
};

export type Conversation = {
  id: string;
  residenceName: string;
  avatar: string;
  lastPreview: string;
  unread: number;
  messages: Message[];
};

export const conversations: Conversation[] = [
  {
    id: "c1",
    residenceName: "Maple Grove Residence",
    avatar: images.caregiverSenior,
    lastPreview: "We’re delighted to confirm admission for August 1.",
    unread: 1,
    messages: [
      {
        id: "m1",
        from: "residence",
        text: "Thank you for applying to Maple Grove. We’ve reviewed Margaret’s profile.",
        time: "Mar 18 · 10:12",
      },
      {
        id: "m2",
        from: "family",
        text: "Wonderful — happy to provide anything else you need.",
        time: "Mar 18 · 11:40",
      },
      {
        id: "m3",
        from: "residence",
        type: "visit",
        text: "Would you like to schedule a family visit next week?",
        meta: "Proposed: Tue Apr 21 · 2:00 PM",
        time: "Apr 2 · 09:05",
      },
      {
        id: "m4",
        from: "residence",
        type: "admission",
        text: "We’re delighted to confirm admission for August 1.",
        meta: "Admission confirmed",
        time: "Apr 2 · 14:22",
      },
    ],
  },
  {
    id: "c2",
    residenceName: "Lakeside Haven",
    avatar: images.gentleCare,
    lastPreview: "Please upload a doctor’s letter and recent labs.",
    unread: 2,
    messages: [
      {
        id: "m1",
        from: "residence",
        type: "document-request",
        text: "To continue reviewing the application, please upload the following.",
        meta: "Doctor’s letter · Recent lab results",
        time: "Apr 8 · 15:30",
      },
      {
        id: "m2",
        from: "family",
        text: "We’ll have these uploaded by Friday.",
        time: "Apr 8 · 16:10",
      },
    ],
  },
  {
    id: "c3",
    residenceName: "Cedar Memory Care",
    avatar: images.holdingHands,
    lastPreview: "Margaret is currently position 4 on our waiting list.",
    unread: 0,
    messages: [
      {
        id: "m1",
        from: "residence",
        text: "Margaret is currently position 4 on our waiting list. We’ll notify you as soon as a suite opens.",
        time: "Apr 5 · 11:00",
      },
    ],
  },
];
