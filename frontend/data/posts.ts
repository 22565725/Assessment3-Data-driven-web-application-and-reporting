import type { Post } from "@/lib/types";

export const posts: Post[] = [
  {
    id: 1,
    title: "What an RSS feed actually is",
    description:
      "RSS is a plain XML document that a website republishes whenever it posts something new. Each item carries a title, a link, a publication date and a summary, which is exactly the shape this interface is built around.",
    author: "Gizem Erel",
    date: "12/07/2026",
    imageUrl:
      "https://media.geeksforgeeks.org/wp-content/uploads/20211213172224/1.png",
  },
  {
    id: 2,
    title: "Why an LMS wants a feed reader",
    description:
      "Course coordinators currently paste links into announcements by hand. Pulling the same material through a feed means one subscription updates every enrolled student automatically.",
    author: "Gizem Erel",
    date: "14/07/2026",
    imageUrl:
      "https://media.geeksforgeeks.org/wp-content/uploads/20211213172225/2.png",
  },
  {
    id: 3,
    title: "Sourcing content from a feed URL",
    description:
      "In Assessment 2 the server will poll each subscribed URL on a schedule, parse the XML, and store new items. This screen is the front end that work will plug into.",
    author: "Gizem Erel",
    date: "18/07/2026",
    imageUrl:
      "https://media.geeksforgeeks.org/wp-content/uploads/20211213172226/3.png",
  },
  {
    id: 4,
    title: "Designing cards for quick scanning",
    description:
      "Readers skim feeds rather than read them. Titles carry the most weight, dates and authors sit in a lighter colour, and summaries truncate until the reader asks for more.",
    author: "Gizem Erel",
    date: "20/07/2026",
    imageUrl:
      "https://media.geeksforgeeks.org/wp-content/uploads/20211213172227/4.png",
  },
  {
    id: 5,
    title: "Storing preferences in the browser",
    description:
      "Theme choice and locally created posts are kept in localStorage, so the interface remembers your settings between visits without any server involvement yet.",
    author: "Gizem Erel",
    date: "23/07/2026",
    imageUrl:
      "https://media.geeksforgeeks.org/wp-content/uploads/20211213172229/5.png",
  },
];
