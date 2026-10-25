// Demo data used by the prototype screens. Replace with API calls in the final build.
export const demoWaste = [
  { id: 1, material: "NBR Rubber Scrap", polymer: "NBR", qty: 500, quality: 85, status: "Available", date: "10 Oct 2026" },
  { id: 2, material: "Rejected O-Rings", polymer: "NBR", qty: 120, quality: 91, status: "Available", date: "08 Oct 2026" },
  { id: 3, material: "EPDM Scrap", polymer: "EPDM", qty: 250, quality: 78, status: "Matched", date: "05 Oct 2026" }
];

export const matches = [
  { rank: 1, name: "Rubber Recycler A", type: "Recycler", location: "Pimpri, Pune (32 km)", score: 91, required: "NBR Scrap / 400 KG", min: "70%" },
  { rank: 2, name: "Rubber Processing Unit B", type: "Manufacturer", location: "Chakan, Pune (56 km)", score: 84, required: "Rubber Scrap / 300 KG", min: "75%" },
  { rank: 3, name: "Construction Material C", type: "Construction", location: "Nashik (120 km)", score: 76, required: "Rubber Granules / 1000 KG", min: "60%" }
];

