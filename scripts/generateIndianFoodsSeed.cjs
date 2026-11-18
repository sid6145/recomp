const fs = require('fs');
const path = require('path');

// Smart Serving Size Engine
const getServings = (type) => {
  switch (type) {
    case 'liquid':
      return [
        { unit: "ml", weightInGrams: 1 },
        { unit: "glass (large)", weightInGrams: 250 },
        { unit: "cup (small)", weightInGrams: 150 }
      ];
    case 'sugar_oil':
      return [
        { unit: "gram", weightInGrams: 1 },
        { unit: "teaspoon", weightInGrams: 5 },
        { unit: "tablespoon", weightInGrams: 15 }
      ];
    case 'curry_dal':
      return [
        { unit: "gram", weightInGrams: 1 },
        { unit: "katori (medium)", weightInGrams: 150 },
        { unit: "bowl (large)", weightInGrams: 250 }
      ];
    case 'solid':
      return [
        { unit: "gram", weightInGrams: 1 },
        { unit: "piece (medium)", weightInGrams: 80 }
      ];
    case 'raw':
    default:
      return [
        { unit: "gram", weightInGrams: 1 },
        { unit: "100g", weightInGrams: 100 }
      ];
  }
};

// Data Schema: [id, name, calories, protein, carbs, fats, servingType]
const rawData = [
  // --- 1. Drinks & Juices (50 items) ---
  ['d_01', 'Sugarcane Juice', 39, 0.2, 9.8, 0, 'liquid'],
  ['d_02', 'Mango Lassi', 110, 3.5, 17, 3.2, 'liquid'],
  ['d_03', 'Masala Chaas', 15, 1.5, 1.8, 0.5, 'liquid'],
  ['d_04', 'Filter Coffee', 42, 1.8, 4.2, 1.9, 'liquid'],
  ['d_05', 'Cutting Chai', 65, 1.5, 9.5, 2.3, 'liquid'],
  ['d_06', 'Nimbu Pani (Sweet)', 45, 0.1, 11.5, 0, 'liquid'],
  ['d_07', 'Coconut Water', 19, 0.7, 3.7, 0.2, 'liquid'],
  ['d_08', 'Rooh Afza (with Milk)', 95, 3.0, 15, 3.0, 'liquid'],
  ['d_09', 'Jaljeera', 10, 0.2, 2.1, 0.1, 'liquid'],
  ['d_10', 'Thandai', 120, 4.0, 16.5, 4.5, 'liquid'],
  ['d_11', 'Badam Milk', 105, 4.5, 12, 4.8, 'liquid'],
  ['d_12', 'Sweet Lassi', 95, 3.2, 14, 3.0, 'liquid'],
  ['d_13', 'Salted Lassi', 45, 3.2, 4.5, 1.5, 'liquid'],
  ['d_14', 'Kokum Sherbet', 35, 0, 8.5, 0, 'liquid'],
  ['d_15', 'Aam Panna', 40, 0.2, 9.5, 0.1, 'liquid'],
  ['d_16', 'Rose Milk', 100, 3.3, 14.5, 3.2, 'liquid'],
  ['d_17', 'Falooda', 145, 3.5, 22, 4.8, 'liquid'],
  ['d_18', 'Shikanji', 38, 0.1, 9.5, 0, 'liquid'],
  ['d_19', 'Neer Mor', 12, 1.0, 1.5, 0.2, 'liquid'],
  ['d_20', 'Solkadhi', 45, 1.2, 2.5, 3.5, 'liquid'],
  ['d_21', 'Buttermilk (Plain)', 20, 1.5, 2.5, 0.5, 'liquid'],
  ['d_22', 'Mausambi Juice', 43, 0.8, 10.5, 0.2, 'liquid'],
  ['d_23', 'Pomegranate Juice', 54, 0.2, 13.1, 0.3, 'liquid'],
  ['d_24', 'Watermelon Juice', 30, 0.6, 7.6, 0.2, 'liquid'],
  ['d_25', 'Orange Juice (Fresh)', 45, 0.7, 10.4, 0.2, 'liquid'],
  ['d_26', 'Apple Juice', 46, 0.1, 11.3, 0.1, 'liquid'],
  ['d_27', 'Grape Juice', 60, 0.4, 14.8, 0.1, 'liquid'],
  ['d_28', 'Guava Juice', 42, 0.5, 9.8, 0.2, 'liquid'],
  ['d_29', 'Pineapple Juice', 53, 0.4, 13, 0.1, 'liquid'],
  ['d_30', 'Papaya Juice', 39, 0.5, 9.8, 0.1, 'liquid'],
  ['d_31', 'Carrot Juice', 39, 0.9, 9.3, 0.2, 'liquid'],
  ['d_32', 'Beetroot Juice', 43, 1.6, 9.6, 0.2, 'liquid'],
  ['d_33', 'Mixed Fruit Juice', 48, 0.5, 11.5, 0.2, 'liquid'],
  ['d_34', 'Tomato Juice', 17, 0.8, 4.2, 0.1, 'liquid'],
  ['d_35', 'Aloe Vera Juice', 15, 0.1, 3.8, 0, 'liquid'],
  ['d_36', 'Amla Juice', 20, 0.5, 4.5, 0.1, 'liquid'],
  ['d_37', 'Lemon Tea', 5, 0, 1.2, 0, 'liquid'],
  ['d_38', 'Green Tea', 2, 0, 0.5, 0, 'liquid'],
  ['d_39', 'Black Tea', 2, 0, 0.5, 0, 'liquid'],
  ['d_40', 'Ginger Tea', 4, 0.1, 0.9, 0, 'liquid'],
  ['d_41', 'Cardamom Tea', 3, 0.1, 0.7, 0, 'liquid'],
  ['d_42', 'Tulsi Tea', 2, 0, 0.5, 0, 'liquid'],
  ['d_43', 'Cold Coffee', 85, 2.8, 12.5, 2.6, 'liquid'],
  ['d_44', 'Frappe', 130, 3.2, 18, 4.8, 'liquid'],
  ['d_45', 'Vanilla Milkshake', 115, 3.5, 16.5, 4.0, 'liquid'],
  ['d_46', 'Chocolate Milkshake', 135, 3.8, 19, 4.9, 'liquid'],
  ['d_47', 'Strawberry Milkshake', 120, 3.3, 17, 4.1, 'liquid'],
  ['d_48', 'Mango Milkshake', 125, 3.4, 18, 4.2, 'liquid'],
  ['d_49', 'Banana Milkshake', 118, 3.5, 17, 3.9, 'liquid'],
  ['d_50', 'Rooh Afza (Water)', 45, 0, 11.2, 0, 'liquid'],

  // --- 2. Home Cooked (Regional) (50 items) ---
  ['h_01', 'Dal Tadka', 115, 6.5, 16.2, 3.5, 'curry_dal'],
  ['h_02', 'Rajma Chawal (Mixed)', 135, 5.2, 24.5, 2.1, 'curry_dal'],
  ['h_03', 'Baingan Bharta', 78, 1.8, 9.5, 4.2, 'curry_dal'],
  ['h_04', 'Palak Paneer', 145, 8.5, 7.5, 10.5, 'curry_dal'],
  ['h_05', 'Sambar', 85, 3.5, 14.2, 2.1, 'curry_dal'],
  ['h_06', 'Rasam', 45, 1.2, 8.5, 1.5, 'curry_dal'],
  ['h_07', 'Avial', 110, 2.5, 10.5, 6.5, 'curry_dal'],
  ['h_08', 'Dhokla (Khaman)', 155, 5.5, 22.5, 4.5, 'solid'],
  ['h_09', 'Thepla', 290, 8.5, 42.5, 9.5, 'solid'],
  ['h_10', 'Litti Chokha', 210, 7.2, 35.5, 5.5, 'solid'],
  ['h_11', 'Poha', 140, 2.8, 25.5, 3.5, 'curry_dal'],
  ['h_12', 'Upma', 135, 3.5, 21.5, 4.2, 'curry_dal'],
  ['h_13', 'Khichdi (Moong Dal)', 110, 3.8, 20.5, 2.2, 'curry_dal'],
  ['h_14', 'Chole Bhature (Mixed)', 280, 7.5, 34.5, 12.5, 'curry_dal'],
  ['h_15', 'Aloo Gobi', 85, 2.5, 12.5, 3.5, 'curry_dal'],
  ['h_16', 'Bhindi Masala', 95, 2.1, 9.5, 5.5, 'curry_dal'],
  ['h_17', 'Paneer Butter Masala', 220, 8.5, 11.5, 16.5, 'curry_dal'],
  ['h_18', 'Matar Paneer', 165, 7.8, 12.5, 10.5, 'curry_dal'],
  ['h_19', 'Kadai Paneer', 185, 8.5, 10.5, 12.5, 'curry_dal'],
  ['h_20', 'Shahi Paneer', 210, 8.2, 13.5, 14.5, 'curry_dal'],
  ['h_21', 'Malai Kofta', 240, 6.5, 18.5, 16.5, 'curry_dal'],
  ['h_22', 'Mix Veg Curry', 95, 2.5, 11.5, 4.5, 'curry_dal'],
  ['h_23', 'Dum Aloo', 125, 2.2, 18.5, 5.5, 'curry_dal'],
  ['h_24', 'Aloo Matar', 110, 3.2, 16.5, 3.5, 'curry_dal'],
  ['h_25', 'Aloo Jeera', 115, 2.1, 19.5, 3.8, 'curry_dal'],
  ['h_26', 'Gobi Matar', 85, 3.1, 11.5, 3.2, 'curry_dal'],
  ['h_27', 'Chana Masala', 135, 6.2, 18.5, 4.5, 'curry_dal'],
  ['h_28', 'Dal Makhani', 150, 6.8, 16.5, 7.5, 'curry_dal'],
  ['h_29', 'Moong Dal (Yellow)', 105, 7.2, 17.5, 1.5, 'curry_dal'],
  ['h_30', 'Masoor Dal', 110, 7.5, 18.5, 1.2, 'curry_dal'],
  ['h_31', 'Toor Dal', 115, 7.1, 18.5, 1.8, 'curry_dal'],
  ['h_32', 'Urad Dal', 125, 7.5, 19.5, 2.5, 'curry_dal'],
  ['h_33', 'Kadhi Pakora', 145, 5.2, 15.5, 7.5, 'curry_dal'],
  ['h_34', 'Undhiyu', 140, 3.5, 16.5, 7.2, 'curry_dal'],
  ['h_35', 'Bisi Bele Bath', 155, 4.5, 26.5, 4.5, 'curry_dal'],
  ['h_36', 'Lemon Rice', 165, 3.2, 28.5, 5.2, 'curry_dal'],
  ['h_37', 'Tamarind Rice', 170, 3.5, 29.5, 5.5, 'curry_dal'],
  ['h_38', 'Tomato Rice', 155, 2.8, 27.5, 4.5, 'curry_dal'],
  ['h_39', 'Curd Rice', 125, 3.5, 21.5, 3.2, 'curry_dal'],
  ['h_40', 'Coconut Rice', 185, 3.2, 28.5, 7.5, 'curry_dal'],
  ['h_41', 'Veg Pulao', 135, 3.1, 24.5, 3.2, 'curry_dal'],
  ['h_42', 'Jeera Rice', 145, 2.8, 26.5, 3.5, 'curry_dal'],
  ['h_43', 'Peas Pulao', 140, 3.5, 25.5, 3.2, 'curry_dal'],
  ['h_44', 'Chicken Curry (Home style)', 165, 16.5, 5.5, 8.5, 'curry_dal'],
  ['h_45', 'Mutton Curry', 210, 18.5, 4.5, 13.5, 'curry_dal'],
  ['h_46', 'Fish Curry', 145, 14.5, 6.5, 7.2, 'curry_dal'],
  ['h_47', 'Egg Curry', 135, 10.5, 5.5, 8.5, 'curry_dal'],
  ['h_48', 'Roti (Phulka)', 297, 9.5, 62.5, 1.5, 'solid'],
  ['h_49', 'Plain Paratha', 320, 8.5, 55.5, 8.5, 'solid'],
  ['h_50', 'Naan (Butter)', 315, 8.2, 52.5, 9.5, 'solid'],

  // --- 3. Street Food (50 items) ---
  ['s_01', 'Vada Pav', 265, 5.5, 35.5, 11.5, 'solid'],
  ['s_02', 'Misal Pav (Mixed)', 185, 7.5, 24.5, 7.2, 'curry_dal'],
  ['s_03', 'Dabeli', 245, 5.2, 36.5, 9.5, 'solid'],
  ['s_04', 'Pani Puri (6 pieces)', 165, 4.5, 32.5, 2.5, 'solid'],
  ['s_05', 'Bhel Puri', 145, 3.5, 28.5, 3.2, 'curry_dal'],
  ['s_06', 'Samosa Chaat', 225, 6.5, 31.5, 9.5, 'solid'],
  ['s_07', 'Aloo Tikki', 215, 3.5, 32.5, 9.2, 'solid'],
  ['s_08', 'Kathi Roll (Veg)', 235, 6.5, 34.5, 8.5, 'solid'],
  ['s_09', 'Momos (Steamed Veg)', 155, 4.5, 28.5, 2.1, 'solid'],
  ['s_10', 'Pav Bhaji', 165, 4.5, 21.5, 7.5, 'curry_dal'],
  ['s_11', 'Sev Puri', 185, 4.2, 28.5, 7.5, 'solid'],
  ['s_12', 'Dahi Puri', 175, 5.5, 26.5, 6.5, 'solid'],
  ['s_13', 'Papdi Chaat', 195, 5.2, 28.5, 7.8, 'solid'],
  ['s_14', 'Ragda Pattice', 185, 5.5, 29.5, 6.2, 'curry_dal'],
  ['s_15', 'Chole Kulche', 245, 8.5, 38.5, 7.5, 'curry_dal'],
  ['s_16', 'Ram Ladoo', 210, 7.5, 28.5, 8.5, 'solid'],
  ['s_17', 'Kachori (Dal)', 310, 6.5, 38.5, 15.5, 'solid'],
  ['s_18', 'Bread Pakora', 285, 7.2, 34.5, 14.5, 'solid'],
  ['s_19', 'Mirchi Bajji', 245, 5.5, 28.5, 13.5, 'solid'],
  ['s_20', 'Onion Pakoda', 315, 6.5, 36.5, 16.5, 'solid'],
  ['s_21', 'Paneer Pakoda', 345, 11.5, 28.5, 22.5, 'solid'],
  ['s_22', 'Egg Roll', 255, 11.5, 29.5, 11.5, 'solid'],
  ['s_23', 'Chicken Roll', 275, 14.5, 31.5, 11.5, 'solid'],
  ['s_24', 'Paneer Tikka', 225, 14.5, 12.5, 14.5, 'solid'],
  ['s_25', 'Chicken Tikka', 185, 24.5, 4.5, 8.5, 'solid'],
  ['s_26', 'Seekh Kebab (Mutton)', 245, 21.5, 6.5, 15.5, 'solid'],
  ['s_27', 'Hara Bhara Kebab', 185, 6.5, 22.5, 8.5, 'solid'],
  ['s_28', 'Gobi Manchurian (Dry)', 215, 4.5, 32.5, 8.5, 'solid'],
  ['s_29', 'Chilli Paneer', 265, 12.5, 21.5, 15.5, 'solid'],
  ['s_30', 'Veg Noodles (Hakka)', 185, 5.5, 32.5, 4.5, 'curry_dal'],
  ['s_31', 'Chicken Noodles', 215, 11.5, 31.5, 5.5, 'curry_dal'],
  ['s_32', 'Veg Fried Rice', 195, 4.5, 34.5, 5.5, 'curry_dal'],
  ['s_33', 'Chicken Fried Rice', 225, 12.5, 32.5, 6.5, 'curry_dal'],
  ['s_34', 'Spring Roll (Veg)', 255, 5.5, 31.5, 12.5, 'solid'],
  ['s_35', 'Plain Dosa', 165, 4.5, 31.5, 2.5, 'solid'],
  ['s_36', 'Masala Dosa', 210, 5.5, 34.5, 6.5, 'solid'],
  ['s_37', 'Rava Dosa', 185, 4.8, 35.5, 3.5, 'solid'],
  ['s_38', 'Onion Dosa', 195, 5.2, 33.5, 4.5, 'solid'],
  ['s_39', 'Cheese Dosa', 265, 8.5, 32.5, 12.5, 'solid'],
  ['s_40', 'Uttapam', 175, 4.5, 32.5, 3.5, 'solid'],
  ['s_41', 'Idli (Steamed)', 145, 4.5, 31.5, 0.5, 'solid'],
  ['s_42', 'Medu Vada', 285, 6.5, 34.5, 14.5, 'solid'],
  ['s_43', 'Dal Vada', 275, 8.5, 32.5, 12.5, 'solid'],
  ['s_44', 'Sabudana Vada', 315, 3.5, 42.5, 15.5, 'solid'],
  ['s_45', 'Batata Vada', 265, 3.5, 34.5, 13.5, 'solid'],
  ['s_46', 'Kheema Pav', 285, 14.5, 28.5, 13.5, 'solid'],
  ['s_47', 'Frankie (Veg)', 235, 6.5, 35.5, 8.5, 'solid'],
  ['s_48', 'Ice Gola (Kala Khatta)', 85, 0, 21.5, 0, 'solid'],
  ['s_49', 'Chana Jor Garam', 185, 8.5, 31.5, 4.5, 'solid'],
  ['s_50', 'Roasted Corn (Bhutta)', 125, 4.5, 26.5, 1.5, 'solid'],

  // --- 4. Fruits & Veg (50 items) ---
  ['f_01', 'Indian Mango (Alphonso)', 60, 0.8, 15, 0.4, 'solid'],
  ['f_02', 'Guava', 68, 2.6, 14.3, 1, 'solid'],
  ['f_03', 'Sapota (Chikoo)', 83, 0.4, 20, 1.1, 'solid'],
  ['f_04', 'Papaya', 43, 0.5, 11, 0.3, 'solid'],
  ['f_05', 'Banana', 89, 1.1, 22.8, 0.3, 'solid'],
  ['f_06', 'Jackfruit', 95, 1.7, 23.2, 0.6, 'solid'],
  ['f_07', 'Jamun', 60, 0.7, 14, 0.2, 'solid'],
  ['f_08', 'Bhindi (Okra Raw)', 33, 1.9, 7.5, 0.2, 'raw'],
  ['f_09', 'Bitter Gourd (Karela Raw)', 17, 1, 3.7, 0.2, 'raw'],
  ['f_10', 'Bottle Gourd (Lauki Raw)', 14, 0.2, 3.4, 0.1, 'raw'],
  ['f_11', 'Apple', 52, 0.3, 13.8, 0.2, 'solid'],
  ['f_12', 'Orange', 47, 0.9, 11.8, 0.1, 'solid'],
  ['f_13', 'Grapes', 69, 0.7, 18.1, 0.2, 'solid'],
  ['f_14', 'Pomegranate', 83, 1.7, 18.7, 1.2, 'solid'],
  ['f_15', 'Watermelon', 30, 0.6, 7.6, 0.2, 'solid'],
  ['f_16', 'Muskmelon', 34, 0.8, 8.2, 0.2, 'solid'],
  ['f_17', 'Pineapple', 50, 0.5, 13.1, 0.1, 'solid'],
  ['f_18', 'Custard Apple (Sitaphal)', 94, 2.1, 23.6, 0.3, 'solid'],
  ['f_19', 'Lychee', 66, 0.8, 16.5, 0.4, 'solid'],
  ['f_20', 'Pear', 57, 0.4, 15.2, 0.1, 'solid'],
  ['f_21', 'Peach', 39, 0.9, 9.5, 0.3, 'solid'],
  ['f_22', 'Plum', 46, 0.7, 11.4, 0.3, 'solid'],
  ['f_23', 'Cherry', 50, 1.0, 12.2, 0.3, 'solid'],
  ['f_24', 'Strawberry', 32, 0.7, 7.7, 0.3, 'solid'],
  ['f_25', 'Mulberry', 43, 1.4, 9.8, 0.4, 'solid'],
  ['f_26', 'Fig (Fresh)', 74, 0.8, 19.2, 0.3, 'solid'],
  ['f_27', 'Dates (Fresh)', 282, 2.5, 75, 0.4, 'solid'],
  ['f_28', 'Tomato', 18, 0.9, 3.9, 0.2, 'raw'],
  ['f_29', 'Onion', 40, 1.1, 9.3, 0.1, 'raw'],
  ['f_30', 'Potato (Raw)', 77, 2.0, 17.5, 0.1, 'raw'],
  ['f_31', 'Carrot', 41, 0.9, 9.6, 0.2, 'raw'],
  ['f_32', 'Beetroot', 43, 1.6, 9.6, 0.2, 'raw'],
  ['f_33', 'Radish', 16, 0.7, 3.4, 0.1, 'raw'],
  ['f_34', 'Turnip', 28, 0.9, 6.4, 0.1, 'raw'],
  ['f_35', 'Cabbage', 25, 1.3, 5.8, 0.1, 'raw'],
  ['f_36', 'Cauliflower', 25, 1.9, 5.0, 0.3, 'raw'],
  ['f_37', 'Broccoli', 34, 2.8, 6.6, 0.4, 'raw'],
  ['f_38', 'Spinach (Palak)', 23, 2.9, 3.6, 0.4, 'raw'],
  ['f_39', 'Fenugreek Leaves (Methi)', 49, 4.4, 6.0, 0.9, 'raw'],
  ['f_40', 'Mustard Leaves (Sarson)', 27, 2.9, 4.7, 0.4, 'raw'],
  ['f_41', 'Amaranth Leaves', 23, 2.5, 4.0, 0.3, 'raw'],
  ['f_42', 'Coriander Leaves', 23, 2.1, 3.7, 0.5, 'raw'],
  ['f_43', 'Mint Leaves', 70, 3.8, 14.9, 0.9, 'raw'],
  ['f_44', 'Green Chilli', 40, 2.0, 8.8, 0.4, 'raw'],
  ['f_45', 'Capsicum', 20, 1.0, 4.6, 0.2, 'raw'],
  ['f_46', 'Eggplant (Brinjal)', 25, 1.0, 5.9, 0.2, 'raw'],
  ['f_47', 'Pumpkin', 26, 1.0, 6.5, 0.1, 'raw'],
  ['f_48', 'Ridge Gourd (Turai)', 17, 0.6, 3.4, 0.2, 'raw'],
  ['f_49', 'Snake Gourd (Chichinda)', 18, 0.6, 3.9, 0.2, 'raw'],
  ['f_50', 'Ash Gourd (Petha)', 13, 0.4, 3.0, 0.2, 'raw'],

  // --- 5. Sugars, Spices & Raw (50 items) ---
  ['r_01', 'Jaggery (Gud)', 383, 0.4, 98, 0.1, 'sugar_oil'],
  ['r_02', 'Ghee', 898, 0, 0, 99.8, 'sugar_oil'],
  ['r_03', 'Mustard Oil', 884, 0, 0, 100, 'sugar_oil'],
  ['r_04', 'Turmeric Powder', 312, 9.7, 67, 3.2, 'sugar_oil'],
  ['r_05', 'Cumin Seeds (Jeera)', 375, 17.8, 44.2, 22.3, 'sugar_oil'],
  ['r_06', 'Raw Peanuts', 567, 25.8, 16.1, 49.2, 'raw'],
  ['r_07', 'Besan (Gram Flour)', 387, 22.4, 57.8, 6.7, 'raw'],
  ['r_08', 'Atta (Whole Wheat Flour)', 340, 13.2, 72, 2.5, 'raw'],
  ['r_09', 'White Sugar', 387, 0, 100, 0, 'sugar_oil'],
  ['r_10', 'Brown Sugar', 380, 0.1, 98, 0, 'sugar_oil'],
  ['r_11', 'Honey', 304, 0.3, 82.4, 0, 'sugar_oil'],
  ['r_12', 'Coconut Oil', 862, 0, 0, 100, 'sugar_oil'],
  ['r_13', 'Sesame Oil', 884, 0, 0, 100, 'sugar_oil'],
  ['r_14', 'Peanut Oil', 884, 0, 0, 100, 'sugar_oil'],
  ['r_15', 'Sunflower Oil', 884, 0, 0, 100, 'sugar_oil'],
  ['r_16', 'Olive Oil', 884, 0, 0, 100, 'sugar_oil'],
  ['r_17', 'Butter', 717, 0.8, 0.1, 81.1, 'sugar_oil'],
  ['r_18', 'Cheese (Processed)', 330, 20.5, 2.5, 26.5, 'raw'],
  ['r_19', 'Paneer (Raw)', 265, 14.5, 2.5, 21.5, 'raw'],
  ['r_20', 'Tofu (Raw)', 76, 8.1, 1.9, 4.8, 'raw'],
  ['r_21', 'Milk (Full Cream)', 61, 3.2, 4.8, 3.3, 'liquid'],
  ['r_22', 'Curd (Dahi)', 98, 4.3, 3.4, 7.5, 'liquid'],
  ['r_23', 'Coriander Powder', 298, 12.4, 55, 17.8, 'sugar_oil'],
  ['r_24', 'Red Chilli Powder', 282, 13.5, 49.8, 14.3, 'sugar_oil'],
  ['r_25', 'Garam Masala', 345, 11.5, 55.5, 12.5, 'sugar_oil'],
  ['r_26', 'Black Pepper', 251, 10.4, 64, 3.3, 'sugar_oil'],
  ['r_27', 'Cardamom (Elaichi)', 311, 10.8, 68.5, 6.7, 'sugar_oil'],
  ['r_28', 'Cinnamon (Dalchini)', 247, 4.0, 80.6, 1.2, 'sugar_oil'],
  ['r_29', 'Cloves (Laung)', 274, 6.0, 65.5, 13, 'sugar_oil'],
  ['r_30', 'Star Anise', 337, 17.6, 50, 15.9, 'sugar_oil'],
  ['r_31', 'Bay Leaf (Tej Patta)', 313, 7.6, 75, 8.4, 'sugar_oil'],
  ['r_32', 'Fenugreek Seeds (Methi)', 323, 23, 58.3, 6.4, 'sugar_oil'],
  ['r_33', 'Mustard Seeds (Rai)', 508, 26.1, 28.4, 36.2, 'sugar_oil'],
  ['r_34', 'Fennel Seeds (Saunf)', 345, 15.8, 52.3, 14.9, 'sugar_oil'],
  ['r_35', 'Carom Seeds (Ajwain)', 305, 17.1, 43, 21.1, 'sugar_oil'],
  ['r_36', 'Asafoetida (Hing)', 295, 4, 68, 1, 'sugar_oil'],
  ['r_37', 'Salt', 0, 0, 0, 0, 'sugar_oil'],
  ['r_38', 'Black Salt (Kala Namak)', 0, 0, 0, 0, 'sugar_oil'],
  ['r_39', 'Tamarind (Imli)', 239, 2.8, 62.5, 0.6, 'sugar_oil'],
  ['r_40', 'Kokum', 285, 2.5, 68.5, 0.5, 'sugar_oil'],
  ['r_41', 'Almonds', 579, 21.1, 21.6, 49.9, 'raw'],
  ['r_42', 'Walnuts', 654, 15.2, 13.7, 65.2, 'raw'],
  ['r_43', 'Cashews', 553, 18.2, 30.2, 43.8, 'raw'],
  ['r_44', 'Pistachios', 562, 20.2, 27.2, 45.3, 'raw'],
  ['r_45', 'Raisins (Kishmish)', 299, 3.1, 79.2, 0.5, 'raw'],
  ['r_46', 'Sesame Seeds', 573, 17.7, 23.4, 49.7, 'raw'],
  ['r_47', 'Flax Seeds', 534, 18.3, 28.9, 42.2, 'raw'],
  ['r_48', 'Chia Seeds', 486, 16.5, 42.1, 30.7, 'raw'],
  ['r_49', 'Sunflower Seeds', 584, 20.8, 20, 51.5, 'raw'],
  ['r_50', 'Rice (White Raw)', 360, 6.6, 79.3, 0.6, 'raw'],

  // --- 6. Sweets & Snacks (50 items) ---
  ['sn_01', 'Kaju Katli', 465, 11.5, 52.5, 23.5, 'solid'],
  ['sn_02', 'Gulab Jamun', 320, 5.5, 55.5, 9.5, 'solid'],
  ['sn_03', 'Mysore Pak', 525, 4.5, 58.5, 31.5, 'solid'],
  ['sn_04', 'Rasmalai', 255, 7.5, 32.5, 11.5, 'solid'],
  ['sn_05', 'Bhujia', 545, 14.5, 44.5, 35.5, 'raw'],
  ['sn_06', 'Chakli', 485, 8.5, 55.5, 25.5, 'solid'],
  ['sn_07', 'Khakhra', 425, 11.5, 68.5, 11.5, 'solid'],
  ['sn_08', 'Banana Chips', 515, 2.5, 62.5, 29.5, 'raw'],
  ['sn_09', 'Jalebi', 310, 2.5, 68.5, 4.5, 'solid'],
  ['sn_10', 'Rasgulla', 245, 6.5, 52.5, 1.5, 'solid'],
  ['sn_11', 'Barfi (Mawa)', 385, 11.5, 52.5, 14.5, 'solid'],
  ['sn_12', 'Peda', 365, 12.5, 54.5, 11.5, 'solid'],
  ['sn_13', 'Besan Ladoo', 485, 8.5, 58.5, 24.5, 'solid'],
  ['sn_14', 'Motichoor Ladoo', 365, 5.5, 62.5, 11.5, 'solid'],
  ['sn_15', 'Boondi Ladoo', 385, 6.5, 64.5, 12.5, 'solid'],
  ['sn_16', 'Gajar Halwa', 285, 4.5, 38.5, 13.5, 'curry_dal'],
  ['sn_17', 'Sooji Halwa', 315, 3.5, 45.5, 14.5, 'curry_dal'],
  ['sn_18', 'Moong Dal Halwa', 385, 8.5, 42.5, 21.5, 'curry_dal'],
  ['sn_19', 'Payasam', 215, 4.5, 32.5, 7.5, 'curry_dal'],
  ['sn_20', 'Kheer (Rice)', 225, 4.8, 34.5, 7.8, 'curry_dal'],
  ['sn_21', 'Shrikhand', 285, 7.5, 42.5, 9.5, 'curry_dal'],
  ['sn_22', 'Basundi', 265, 8.5, 34.5, 11.5, 'curry_dal'],
  ['sn_23', 'Rabri', 295, 9.5, 32.5, 14.5, 'curry_dal'],
  ['sn_24', 'Puran Poli', 315, 7.5, 56.5, 6.5, 'solid'],
  ['sn_25', 'Modak (Steamed)', 245, 3.5, 48.5, 4.5, 'solid'],
  ['sn_26', 'Ghevar', 425, 4.5, 58.5, 19.5, 'solid'],
  ['sn_27', 'Soan Papdi', 495, 6.5, 64.5, 24.5, 'solid'],
  ['sn_28', 'Sandesh', 285, 12.5, 34.5, 11.5, 'solid'],
  ['sn_29', 'Cham Cham', 275, 9.5, 48.5, 5.5, 'solid'],
  ['sn_30', 'Kalakand', 315, 14.5, 32.5, 14.5, 'solid'],
  ['sn_31', 'Mathri', 515, 8.5, 58.5, 28.5, 'solid'],
  ['sn_32', 'Namak Para', 495, 7.5, 62.5, 24.5, 'solid'],
  ['sn_33', 'Shankarpali', 485, 6.5, 64.5, 22.5, 'solid'],
  ['sn_34', 'Chevda (Fried)', 515, 9.5, 52.5, 31.5, 'raw'],
  ['sn_35', 'Poha Chivda (Roasted)', 425, 8.5, 68.5, 13.5, 'raw'],
  ['sn_36', 'Murukku', 495, 8.5, 56.5, 26.5, 'solid'],
  ['sn_37', 'Nippattu', 485, 9.5, 54.5, 25.5, 'solid'],
  ['sn_38', 'Thattai', 475, 8.5, 58.5, 23.5, 'solid'],
  ['sn_39', 'Seedai', 485, 7.5, 61.5, 24.5, 'solid'],
  ['sn_40', 'Fafda', 525, 11.5, 48.5, 32.5, 'solid'],
  ['sn_41', 'Gathiya', 535, 12.5, 46.5, 33.5, 'solid'],
  ['sn_42', 'Sev (Plain)', 545, 13.5, 44.5, 35.5, 'raw'],
  ['sn_43', 'Ratlami Sev', 555, 14.5, 42.5, 36.5, 'raw'],
  ['sn_44', 'Aloo Bhujia', 565, 11.5, 45.5, 38.5, 'raw'],
  ['sn_45', 'Moong Dal (Fried Snack)', 485, 21.5, 52.5, 21.5, 'raw'],
  ['sn_46', 'Peanut Chikki', 485, 12.5, 58.5, 22.5, 'solid'],
  ['sn_47', 'Sesame Chikki', 515, 11.5, 54.5, 28.5, 'solid'],
  ['sn_48', 'Makhana (Roasted)', 385, 9.5, 68.5, 8.5, 'raw'],
  ['sn_49', 'Bakarwadi', 495, 11.5, 54.5, 25.5, 'solid'],
  ['sn_50', 'Mini Samosa (Dry)', 515, 9.5, 56.5, 28.5, 'solid']
];

// Determine Category String based on ID prefix
const getCategory = (id) => {
  if (id.startsWith('d_')) return "Drinks & Juices";
  if (id.startsWith('h_')) return "Home Cooked";
  if (id.startsWith('s_')) return "Street Food";
  if (id.startsWith('f_')) return "Fruits & Veg";
  if (id.startsWith('r_')) return "Sugars & Spices";
  if (id.startsWith('sn_')) return "Sweets";
  return "Snacks"; // Fallback
};

const generateDatabase = () => {
  console.log('Generating 300 highly accurate Indian food items...');
  
  const formattedDatabase = rawData.map(([id, name, cal, pro, carb, fat, type]) => {
    return {
      id,
      name,
      category: getCategory(id),
      baseMacrosPer100g: {
        calories: cal,
        protein: pro,
        carbs: carb,
        fats: fat
      },
      servings: getServings(type)
    };
  });

  const outputPath = path.join(__dirname, '../src/db/indianFoodsSeed.json');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(formattedDatabase, null, 2));
  console.log(`Successfully wrote 300 structured items to ${outputPath}`);
};

generateDatabase();
