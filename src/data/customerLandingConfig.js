import { cuisines } from "./landingData.js";

export const customerLandingConfig = {
  hero: {
    eyebrow: "GOOD FOOD, GOOD COMPANY",
    heading: "A good meal starts with a table.",
    description:
      "Discover restaurants, compare menus, and book a table for your next meal.",
    backgroundImage: "photo-1414235077428-338989a2e8c0",
    featureImage: "photo-1517248135467-4c7edcad34c4",
    searchLabel: "Restaurant, cuisine or location",
    searchPlaceholder: "Restaurant, cuisine or location",
    searchAction: "Find a table",
    browseAction: "Explore restaurants",
    howItWorksAction: "How booking works",
  },
  cuisines: {
    eyebrow: "FIND YOUR FLAVOR",
    title: "Explore by cuisine",
    fallbackImage: "photo-1504674900247-0877df9cc836",
    items: cuisines,
  },
  featuredRestaurants: {
    eyebrow: "GUEST FAVORITES",
    title: "Top-rated restaurants",
    emptyTitle: "Restaurants are on their way",
    emptyMessage:
      "There are no approved restaurants to feature right now. Please check back soon.",
    limit: 4,
    actionLabel: "View all restaurants",
    actionHref: "/customer/restaurants",
  },
  recentRestaurants: {
    eyebrow: "FRESH DISCOVERIES",
    title: "Recently added",
    limit: 4,
    actionLabel: "Explore all restaurants",
    actionHref: "/customer/restaurants",
  },
  highlights: [
    {
      title: "Find your kind of place",
      description:
        "Explore restaurants by cuisine and compare their menus and reviews.",
    },
    {
      title: "Plan the details",
      description:
        "Choose your date, dining time, party size, and available tables.",
    },
    {
      title: "Keep it all together",
      description:
        "Review your booking and preorder details in one place.",
    },
  ],
  howItWorks: {
    eyebrow: "A BETTER WAY TO DINE",
    title: "Your next meal, made simple",
    steps: [
      {
        title: "Discover a restaurant",
        body: "Search by restaurant, cuisine, or location and explore the menu.",
      },
      {
        title: "Choose your table",
        body: "Pick a date, dining time, party size, and available tables.",
      },
      {
        title: "Confirm your visit",
        body: "Review your booking details and find them later in My reservations.",
      },
    ],
  },
};
