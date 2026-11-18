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
const rawData2 = [
  // --- 1. Drinks & Juices (IDs 51-100) ---
  ['d_51', 'Kashmiri Kahwa', 25, 0.5, 5.0, 0.2, 'liquid'],
  ['d_52', 'Noon Chai (Pink Tea)', 45, 1.2, 4.0, 2.5, 'liquid'],
  ['d_53', 'Bael Sherbet (Wood Apple)', 65, 0.8, 15.5, 0.2, 'liquid'],
  ['d_54', 'Phalsa Sherbet', 55, 0.5, 13.0, 0.1, 'liquid'],
  ['d_55', 'Soy Milk', 43, 3.3, 1.8, 2.0, 'liquid'],
  ['d_56', 'Camel Milk', 53, 3.4, 4.3, 2.5, 'liquid'],
  ['d_57', 'Turmeric Latte (Haldi Doodh)', 75, 3.5, 6.0, 4.0, 'liquid'],
  ['d_58', 'Wheatgrass Juice', 15, 1.0, 2.0, 0.1, 'liquid'],
  ['d_59', 'Ginger Turmeric Shot', 10, 0.2, 2.0, 0.0, 'liquid'],
  ['d_60', 'Sattu Drink (Sweet)', 110, 4.5, 22.0, 1.0, 'liquid'],
  ['d_61', 'Sattu Drink (Salted)', 85, 4.5, 16.0, 1.0, 'liquid'],
  ['d_62', 'Almond Milk (Unsweetened)', 15, 0.6, 0.3, 1.2, 'liquid'],
  ['d_63', 'Oat Milk', 42, 1.0, 7.0, 1.5, 'liquid'],
  ['d_64', 'Piyush (Maharashtrian Drink)', 140, 4.0, 20.0, 5.0, 'liquid'],
  ['d_65', 'Jigarthanda', 165, 4.5, 25.0, 5.5, 'liquid'],
  ['d_66', 'Kanji (Fermented Carrot)', 25, 0.5, 5.5, 0.1, 'liquid'],
  ['d_67', 'Gondhoraj Ghol', 45, 1.5, 6.0, 1.5, 'liquid'],
  ['d_68', 'Buransh Juice (Rhododendron)', 50, 0.2, 12.0, 0.1, 'liquid'],
  ['d_69', 'Kambu Koozh (Pearl Millet Drink)', 75, 2.0, 15.0, 0.5, 'liquid'],
  ['d_70', 'Ragi Malt', 85, 2.5, 18.0, 0.6, 'liquid'],
  ['d_71', 'Kokum Agal (Concentrate)', 15, 0.1, 3.5, 0.0, 'liquid'],
  ['d_72', 'Nannari Sherbet', 55, 0.0, 14.0, 0.0, 'liquid'],
  ['d_73', 'Panakam', 45, 0.1, 11.0, 0.0, 'liquid'],
  ['d_74', 'Chandan Sherbet', 50, 0.0, 12.5, 0.0, 'liquid'],
  ['d_75', 'Khus Sherbet', 55, 0.0, 13.5, 0.0, 'liquid'],
  ['d_76', 'Bhang Thandai', 130, 4.0, 18.0, 4.5, 'liquid'],
  ['d_77', 'Kesar Milk', 75, 3.2, 6.5, 3.5, 'liquid'],
  ['d_78', 'Anjeer Milkshake', 125, 3.8, 20.0, 3.5, 'liquid'],
  ['d_79', 'Chikoo Milkshake', 130, 3.5, 22.0, 3.2, 'liquid'],
  ['d_80', 'Sitaphal Milkshake', 140, 3.8, 24.0, 3.5, 'liquid'],
  ['d_81', 'Maha-Rasam (Clear Broth)', 35, 1.0, 6.0, 1.0, 'liquid'],
  ['d_82', 'Clear Chicken Soup', 45, 6.0, 2.0, 1.5, 'liquid'],
  ['d_83', 'Paya Soup (Trotters)', 110, 9.0, 2.5, 7.5, 'liquid'],
  ['d_84', 'Tomato Shorba', 40, 1.0, 7.0, 1.5, 'liquid'],
  ['d_85', 'Kullad Chai', 70, 1.8, 10.0, 2.5, 'liquid'],
  ['d_86', 'Tandoori Chai', 75, 1.8, 10.5, 2.8, 'liquid'],
  ['d_87', 'Black Coffee (No Sugar)', 2, 0.2, 0.0, 0.0, 'liquid'],
  ['d_88', 'Ghee Coffee (Bulletproof)', 135, 0.2, 0.0, 15.0, 'liquid'],
  ['d_89', 'Kala Khatta Sherbet', 55, 0.0, 14.0, 0.0, 'liquid'],
  ['d_90', 'Mint Coriander Juice', 20, 1.0, 4.0, 0.2, 'liquid'],
  ['d_91', 'Ash Gourd Juice', 15, 0.4, 3.0, 0.1, 'liquid'],
  ['d_92', 'Bitter Gourd Juice', 18, 1.0, 3.5, 0.2, 'liquid'],
  ['d_93', 'Bottle Gourd Juice (Lauki)', 15, 0.3, 3.2, 0.1, 'liquid'],
  ['d_94', 'Mosambi Juice (No Sugar)', 35, 0.8, 8.5, 0.1, 'liquid'],
  ['d_95', 'Sugarcane Juice (Mint & Lemon)', 41, 0.2, 10.2, 0.0, 'liquid'],
  ['d_96', 'Plum Juice', 45, 0.5, 11.0, 0.1, 'liquid'],
  ['d_97', 'Amla Aloe Vera Juice', 18, 0.4, 4.0, 0.1, 'liquid'],
  ['d_98', 'Barley Water', 25, 0.5, 6.0, 0.1, 'liquid'],
  ['d_99', 'Sabja Water (Sweet Basil)', 20, 0.5, 4.0, 0.5, 'liquid'],
  ['d_100', 'Jeera Water', 5, 0.1, 1.0, 0.1, 'liquid'],

  // --- 2. Home Cooked (Regional) (IDs 51-100) ---
  ['h_51', 'Ragi Mudde', 145, 3.5, 32.0, 0.5, 'solid'],
  ['h_52', 'Appam', 155, 2.5, 34.0, 1.5, 'solid'],
  ['h_53', 'Puttu (Rice & Coconut)', 185, 3.5, 36.0, 3.5, 'solid'],
  ['h_54', 'Sarson Ka Saag', 95, 4.5, 10.5, 4.5, 'curry_dal'],
  ['h_55', 'Makki Ki Roti', 290, 7.0, 60.0, 2.5, 'solid'],
  ['h_56', 'Kosambari (Moong Dal Salad)', 85, 5.0, 14.0, 1.5, 'solid'],
  ['h_57', 'Pitla (Besan Curry)', 125, 6.5, 15.0, 4.5, 'curry_dal'],
  ['h_58', 'Ennai Kathirikai (Stuffed Brinjal)', 165, 2.5, 12.0, 12.5, 'curry_dal'],
  ['h_59', 'Fish Molee', 185, 14.0, 6.5, 11.5, 'curry_dal'],
  ['h_60', 'Chicken Chettinad', 215, 16.5, 8.5, 13.5, 'curry_dal'],
  ['h_61', 'Mutton Rogan Josh', 245, 17.5, 5.0, 16.5, 'curry_dal'],
  ['h_62', 'Laal Maas', 265, 18.0, 6.5, 18.0, 'curry_dal'],
  ['h_63', 'Kosha Mangsho', 275, 17.5, 8.0, 19.5, 'curry_dal'],
  ['h_64', 'Aloo Posto', 135, 2.5, 18.0, 6.5, 'curry_dal'],
  ['h_65', 'Shukto', 115, 3.0, 14.0, 5.5, 'curry_dal'],
  ['h_66', 'Chor Chori (Mixed Veg)', 105, 2.5, 12.5, 5.0, 'curry_dal'],
  ['h_67', 'Gatte Ki Sabzi', 175, 7.5, 16.0, 9.5, 'curry_dal'],
  ['h_68', 'Ker Sangri', 195, 6.0, 18.0, 11.5, 'curry_dal'],
  ['h_69', 'Dal Baati (Mashed together)', 320, 9.5, 45.0, 12.5, 'curry_dal'],
  ['h_70', 'Churma', 415, 5.5, 55.0, 19.5, 'solid'],
  ['h_71', 'Akki Roti', 275, 5.5, 55.0, 4.5, 'solid'],
  ['h_72', 'Jolada Roti (Jowar Roti)', 265, 7.5, 58.0, 1.5, 'solid'],
  ['h_73', 'Thalipeeth', 285, 8.5, 52.0, 5.5, 'solid'],
  ['h_74', 'Puran Poli (Dal Stuffed Flatbread)', 310, 7.5, 58.0, 5.5, 'solid'],
  ['h_75', 'Amti (Maharashtrian Dal)', 115, 5.5, 15.0, 3.5, 'curry_dal'],
  ['h_76', 'Zunka', 145, 7.5, 16.5, 5.5, 'solid'],
  ['h_77', 'Bharli Vangi', 155, 3.5, 14.5, 9.5, 'curry_dal'],
  ['h_78', 'Chicken Sukka', 210, 18.5, 6.5, 12.0, 'solid'],
  ['h_79', 'Pork Vindaloo', 285, 16.0, 8.0, 21.0, 'curry_dal'],
  ['h_80', 'Goan Fish Curry', 175, 15.0, 7.0, 9.5, 'curry_dal'],
  ['h_81', 'Chicken Xacuti', 225, 16.5, 9.5, 13.5, 'curry_dal'],
  ['h_82', 'Bamboo Shoot Curry', 95, 2.5, 12.0, 4.5, 'curry_dal'],
  ['h_83', 'Iromba (Manipuri Veg)', 85, 3.5, 14.0, 2.0, 'curry_dal'],
  ['h_84', 'Machher Jhol (Fish Curry)', 145, 14.5, 5.5, 7.5, 'curry_dal'],
  ['h_85', 'Chicken Dak Bungalow', 215, 16.0, 7.5, 13.0, 'curry_dal'],
  ['h_86', 'Bisi Bele Bath (Karnataka)', 165, 4.5, 28.0, 4.5, 'curry_dal'],
  ['h_87', 'Puliyogare (Tamarind Rice)', 175, 3.5, 30.0, 5.0, 'curry_dal'],
  ['h_88', 'Vangi Bath (Brinjal Rice)', 160, 3.0, 28.0, 4.5, 'curry_dal'],
  ['h_89', 'Kuzhi Paniyaram', 195, 5.5, 35.0, 4.0, 'solid'],
  ['h_90', 'Idiyappam', 155, 3.0, 34.0, 0.5, 'solid'],
  ['h_91', 'Kadala Curry (Black Chickpeas)', 145, 6.5, 18.5, 5.0, 'curry_dal'],
  ['h_92', 'Erissery (Pumpkin Curry)', 135, 3.5, 16.0, 6.5, 'curry_dal'],
  ['h_93', 'Olan (Ash Gourd Stew)', 95, 2.0, 8.5, 6.0, 'curry_dal'],
  ['h_94', 'Kalan (Yam Curry)', 125, 3.5, 15.0, 5.5, 'curry_dal'],
  ['h_95', 'Pachadi (Yogurt Mix)', 85, 3.0, 10.0, 3.5, 'curry_dal'],
  ['h_96', 'Gongura Pachadi', 115, 2.5, 12.0, 6.5, 'curry_dal'],
  ['h_97', 'Gongura Mutton', 235, 17.0, 6.0, 15.5, 'curry_dal'],
  ['h_98', 'Hyderabadi Haleem', 215, 15.0, 14.0, 11.0, 'curry_dal'],
  ['h_99', 'Nihari', 255, 18.0, 5.0, 17.5, 'curry_dal'],
  ['h_100', 'Galouti Kebab', 285, 16.5, 8.0, 21.0, 'solid'],

  // --- 3. Street Food (IDs 51-100) ---
  ['s_51', 'Raj Kachori', 245, 6.0, 34.0, 10.0, 'solid'],
  ['s_52', 'Basket Chaat (Tokri Chaat)', 225, 5.5, 31.0, 9.0, 'solid'],
  ['s_53', 'Mirchi Vada', 255, 4.5, 28.0, 14.5, 'solid'],
  ['s_54', 'Pesarattu (Moong Dal Dosa)', 185, 7.5, 32.0, 3.0, 'solid'],
  ['s_55', 'Kothu Parotta', 265, 8.0, 38.0, 9.5, 'curry_dal'],
  ['s_56', 'Litti (Dry, No Chokha)', 275, 8.0, 48.0, 6.0, 'solid'],
  ['s_57', 'Tunday Kabab', 295, 15.5, 10.0, 21.5, 'solid'],
  ['s_58', 'Gobi 65', 210, 4.0, 28.0, 9.5, 'solid'],
  ['s_59', 'Egg Bhurji Pav', 245, 12.0, 28.0, 9.5, 'solid'],
  ['s_60', 'Paneer Bhurji Pav', 265, 10.5, 28.0, 12.5, 'solid'],
  ['s_61', 'Chicken 65', 245, 16.5, 12.0, 14.5, 'solid'],
  ['s_62', 'Paneer 65', 285, 12.5, 18.0, 18.5, 'solid'],
  ['s_63', 'Aloo Bonda', 255, 3.5, 32.0, 12.5, 'solid'],
  ['s_64', 'Mangalore Buns', 310, 5.5, 48.0, 10.5, 'solid'],
  ['s_65', 'Punugulu', 285, 6.5, 42.0, 10.0, 'solid'],
  ['s_66', 'Kuzhi Paniyaram (Sweet)', 215, 3.5, 38.0, 5.5, 'solid'],
  ['s_67', 'Bonda Soup', 185, 6.0, 24.0, 7.5, 'curry_dal'],
  ['s_68', 'Chaat Papdi', 195, 4.5, 28.0, 7.5, 'solid'],
  ['s_69', 'Katori Chaat', 215, 5.0, 30.0, 8.5, 'solid'],
  ['s_70', 'Moong Dal Chilla', 165, 8.5, 24.0, 4.0, 'solid'],
  ['s_71', 'Besan Chilla', 175, 7.5, 26.0, 4.5, 'solid'],
  ['s_72', 'Khandvi', 145, 6.0, 18.0, 5.5, 'solid'],
  ['s_73', 'Patra (Colocasia Leaves)', 165, 5.5, 22.0, 6.0, 'solid'],
  ['s_74', 'Fafda Jalebi (Mixed)', 385, 6.0, 58.0, 15.5, 'solid'],
  ['s_75', 'Gathiya Chaat', 245, 6.5, 32.0, 10.0, 'solid'],
  ['s_76', 'Indori Poha', 155, 3.5, 28.0, 3.5, 'curry_dal'],
  ['s_77', 'Kachori (Pyaz/Onion)', 320, 5.5, 38.0, 16.5, 'solid'],
  ['s_78', 'Kachori (Mawa)', 365, 6.5, 42.0, 19.5, 'solid'],
  ['s_79', 'Jhal Muri', 145, 4.0, 26.0, 3.0, 'solid'],
  ['s_80', 'Ghugni', 135, 6.5, 22.0, 2.5, 'curry_dal'],
  ['s_81', 'Phuchka (Kolkata)', 160, 4.0, 31.0, 2.0, 'solid'],
  ['s_82', 'Aloo Kabli', 125, 3.5, 24.0, 2.0, 'solid'],
  ['s_83', 'Churmur', 155, 4.5, 28.0, 3.5, 'solid'],
  ['s_84', 'Egg Mughlai Paratha', 345, 12.0, 38.0, 16.0, 'solid'],
  ['s_85', 'Chicken Roll (Kolkata Style)', 285, 14.0, 34.0, 11.0, 'solid'],
  ['s_86', 'Fish Fry (Street Style)', 245, 16.0, 12.0, 14.5, 'solid'],
  ['s_87', 'Fish Finger', 265, 14.0, 16.0, 16.5, 'solid'],
  ['s_88', 'Prawn Koliwada', 225, 18.0, 10.0, 12.5, 'solid'],
  ['s_89', 'Chicken Lollipop (Fried)', 285, 18.0, 12.0, 18.5, 'solid'],
  ['s_90', 'Veg Manchurian (Dry)', 215, 4.0, 32.0, 8.5, 'solid'],
  ['s_91', 'Gobi Manchurian (Gravy)', 185, 3.5, 28.0, 6.5, 'curry_dal'],
  ['s_92', 'Chilli Chicken (Dry)', 255, 16.5, 18.0, 12.5, 'solid'],
  ['s_93', 'Dragon Chicken', 275, 16.0, 20.0, 14.5, 'solid'],
  ['s_94', 'American Chopsuey (Veg)', 295, 5.0, 48.0, 9.5, 'curry_dal'],
  ['s_95', 'Schezwan Fried Rice', 215, 4.5, 36.0, 6.0, 'curry_dal'],
  ['s_96', 'Triple Schezwan Rice', 285, 8.0, 42.0, 9.5, 'curry_dal'],
  ['s_97', 'Mushroom Tikka', 145, 5.5, 12.0, 8.5, 'solid'],
  ['s_98', 'Soya Chaap Tikka', 195, 14.5, 12.0, 10.5, 'solid'],
  ['s_99', 'Malai Soya Chaap', 265, 12.5, 14.0, 18.0, 'solid'],
  ['s_100', 'Afghani Soya Chaap', 245, 13.5, 12.0, 16.0, 'solid'],

  // --- 4. Fruits & Veg (IDs 51-100) ---
  ['f_51', 'Drumsticks (Moringa)', 37, 2.1, 8.5, 0.2, 'raw'],
  ['f_52', 'Colocasia (Arbi Root)', 112, 1.5, 26.5, 0.2, 'raw'],
  ['f_53', 'Pointed Gourd (Parwal)', 20, 1.2, 3.1, 0.2, 'raw'],
  ['f_54', 'Ivy Gourd (Tindora)', 18, 1.2, 3.1, 0.1, 'raw'],
  ['f_55', 'Taro Root', 142, 1.5, 34.6, 0.1, 'raw'],
  ['f_56', 'Star Fruit (Kamrakh)', 31, 1.0, 6.7, 0.3, 'solid'],
  ['f_57', 'Wood Apple (Bael Fruit)', 137, 1.8, 31.8, 0.3, 'solid'],
  ['f_58', 'Water Chestnut (Singhara)', 97, 1.4, 23.9, 0.1, 'solid'],
  ['f_59', 'Lotus Stem (Kamal Kakdi)', 74, 2.6, 17.2, 0.1, 'raw'],
  ['f_60', 'Snake Gourd', 18, 0.6, 3.9, 0.2, 'raw'],
  ['f_61', 'Sponge Gourd (Nenua)', 15, 1.2, 2.9, 0.2, 'raw'],
  ['f_62', 'Ash Gourd', 13, 0.4, 3.0, 0.2, 'raw'],
  ['f_63', 'Teasel Gourd (Kantola)', 17, 1.0, 3.1, 0.1, 'raw'],
  ['f_64', 'Yam (Suran/Jimikand)', 118, 1.5, 27.9, 0.2, 'raw'],
  ['f_65', 'Sweet Potato (Shakarkandi)', 86, 1.6, 20.1, 0.1, 'raw'],
  ['f_66', 'Tapioca (Cassava/Kapppa)', 160, 1.4, 38.1, 0.3, 'raw'],
  ['f_67', 'Jackfruit (Raw/Green)', 73, 1.5, 18.0, 0.3, 'raw'],
  ['f_68', 'Plantain (Raw Banana)', 122, 1.3, 31.9, 0.4, 'raw'],
  ['f_69', 'Banana Flower (Kele ka Phool)', 51, 1.6, 9.9, 0.6, 'raw'],
  ['f_70', 'Banana Stem', 35, 0.5, 8.5, 0.1, 'raw'],
  ['f_71', 'Pumpkin Leaves', 19, 3.2, 2.3, 0.2, 'raw'],
  ['f_72', 'Tamarind Leaves', 58, 3.1, 11.4, 0.6, 'raw'],
  ['f_73', 'Curry Leaves', 97, 6.1, 18.7, 1.0, 'raw'],
  ['f_74', 'Colocasia Leaves (Arbi Patta)', 42, 3.0, 6.7, 0.7, 'raw'],
  ['f_75', 'Amaranth (Red/Lal Math)', 23, 2.5, 4.0, 0.3, 'raw'],
  ['f_76', 'Bathua Leaves (Chenopodium)', 43, 4.2, 7.3, 0.8, 'raw'],
  ['f_77', 'Gongura Leaves', 47, 3.2, 7.1, 0.9, 'raw'],
  ['f_78', 'Poi Saag (Malabar Spinach)', 19, 1.8, 3.4, 0.3, 'raw'],
  ['f_79', 'Cholai (Green Amaranth)', 23, 2.5, 4.0, 0.3, 'raw'],
  ['f_80', 'Water Spinach (Kalmi Saag)', 19, 2.6, 3.1, 0.2, 'raw'],
  ['f_81', 'Cluster Beans (Gawar)', 16, 3.2, 6.9, 0.4, 'raw'],
  ['f_82', 'French Beans', 31, 1.8, 7.1, 0.2, 'raw'],
  ['f_83', 'Broad Beans (Sem)', 47, 3.8, 8.1, 0.5, 'raw'],
  ['f_84', 'Yardlong Beans (Bora)', 47, 2.8, 8.3, 0.4, 'raw'],
  ['f_85', 'Green Peas (Matar)', 81, 5.4, 14.5, 0.4, 'raw'],
  ['f_86', 'Snow Peas', 42, 2.8, 7.5, 0.2, 'raw'],
  ['f_87', 'Spring Onion (Scallion)', 32, 1.8, 7.3, 0.2, 'raw'],
  ['f_88', 'Leek', 61, 1.5, 14.2, 0.3, 'raw'],
  ['f_89', 'Mushroom (Button)', 22, 3.1, 3.3, 0.3, 'raw'],
  ['f_90', 'Bamboo Shoot', 27, 2.6, 5.2, 0.3, 'raw'],
  ['f_91', 'Gooseberry (Amla)', 44, 0.9, 10.2, 0.6, 'solid'],
  ['f_92', 'Phalsa (Grewia Asiatica)', 90, 1.5, 21.0, 0.5, 'solid'],
  ['f_93', 'Karonda (Carandas Plum)', 42, 1.1, 10.5, 0.2, 'solid'],
  ['f_94', 'Jujube (Ber)', 79, 1.2, 20.2, 0.2, 'solid'],
  ['f_95', 'Ice Apple (Targola/Munjal)', 43, 0.8, 10.5, 0.1, 'solid'],
  ['f_96', 'Mulberry (Shahtoot)', 43, 1.4, 9.8, 0.4, 'solid'],
  ['f_97', 'Rose Apple (Safed Jamun)', 25, 0.6, 5.7, 0.3, 'solid'],
  ['f_98', 'Persimmon (Amarphal)', 81, 0.6, 18.6, 0.2, 'solid'],
  ['f_99', 'Dragon Fruit (Pitaya)', 60, 1.2, 12.9, 0.0, 'solid'],
  ['f_100', 'Sweet Lime (Mosambi)', 43, 0.8, 10.5, 0.2, 'solid'],

  // --- 5. Sugars, Spices & Raw (IDs 51-100) ---
  ['r_51', 'Ragi Flour (Finger Millet)', 328, 7.3, 72.0, 1.3, 'raw'],
  ['r_52', 'Bajra Flour (Pearl Millet)', 378, 11.6, 67.5, 5.0, 'raw'],
  ['r_53', 'Jowar Flour (Sorghum)', 349, 10.4, 72.6, 1.9, 'raw'],
  ['r_54', 'Sattu (Roasted Gram Flour)', 413, 25.4, 61.5, 5.2, 'raw'],
  ['r_55', 'Amaranth Flour (Rajgira)', 371, 13.6, 65.2, 7.0, 'raw'],
  ['r_56', 'Horse Gram (Kulthi)', 321, 22.0, 57.2, 0.5, 'raw'],
  ['r_57', 'Moth Bean (Matki)', 343, 22.9, 61.5, 1.6, 'raw'],
  ['r_58', 'Nutmeg (Jaiphal)', 525, 5.8, 49.3, 36.3, 'sugar_oil'],
  ['r_59', 'Mace (Javitri)', 475, 6.7, 50.5, 32.4, 'sugar_oil'],
  ['r_60', 'Black Cardamom (Badi Elaichi)', 311, 10.8, 68.5, 6.7, 'sugar_oil'],
  ['r_61', 'Dry Mango Powder (Amchur)', 315, 2.5, 78.0, 0.5, 'sugar_oil'],
  ['r_62', 'Poppy Seeds (Khus Khus)', 525, 18.0, 28.1, 41.6, 'raw'],
  ['r_63', 'Watermelon Seeds (Magaj)', 557, 28.3, 15.3, 47.4, 'raw'],
  ['r_64', 'Pumpkin Seeds', 559, 30.2, 10.7, 49.0, 'raw'],
  ['r_65', 'Fox Nuts (Makhana Raw)', 347, 9.7, 76.9, 0.1, 'raw'],
  ['r_66', 'Sago (Sabudana)', 351, 0.2, 87.1, 0.2, 'raw'],
  ['r_67', 'Barnyard Millet (Sanwa)', 341, 11.2, 65.5, 3.9, 'raw'],
  ['r_68', 'Foxtail Millet (Kangni)', 331, 12.3, 60.9, 4.3, 'raw'],
  ['r_69', 'Little Millet (Kutki)', 341, 9.7, 67.0, 4.7, 'raw'],
  ['r_70', 'Kodo Millet', 353, 8.3, 65.9, 1.4, 'raw'],
  ['r_71', 'Proso Millet (Chena)', 356, 12.5, 70.4, 1.1, 'raw'],
  ['r_72', 'Brown Rice', 370, 7.9, 77.2, 2.9, 'raw'],
  ['r_73', 'Red Rice', 405, 7.0, 86.0, 2.5, 'raw'],
  ['r_74', 'Black Rice', 356, 8.5, 75.0, 3.2, 'raw'],
  ['r_75', 'Basmati Rice (Raw)', 358, 8.2, 78.5, 0.6, 'raw'],
  ['r_76', 'Rice Flakes (Poha Raw)', 346, 6.6, 77.3, 1.2, 'raw'],
  ['r_77', 'Puffed Rice (Murmura Raw)', 396, 6.3, 89.8, 0.5, 'raw'],
  ['r_78', 'Rice Vermicelli (Raw)', 364, 8.0, 81.5, 0.5, 'raw'],
  ['r_79', 'Wheat Vermicelli (Seviyan Raw)', 365, 12.5, 75.0, 1.5, 'raw'],
  ['r_80', 'Semolina (Sooji/Rava)', 360, 12.7, 72.8, 1.0, 'raw'],
  ['r_81', 'Maida (Refined Flour)', 364, 10.3, 76.3, 1.0, 'raw'],
  ['r_82', 'Soya Chunks (Nutrela Raw)', 345, 52.0, 33.0, 0.5, 'raw'],
  ['r_83', 'Soybean (Raw Seeds)', 446, 36.5, 30.2, 19.9, 'raw'],
  ['r_84', 'Green Gram (Moong Whole)', 347, 23.9, 62.6, 1.2, 'raw'],
  ['r_85', 'Bengal Gram (Chana Whole)', 364, 20.5, 60.9, 5.3, 'raw'],
  ['r_86', 'Black Gram (Urad Whole)', 341, 25.2, 58.9, 1.6, 'raw'],
  ['r_87', 'Red Lentil (Masoor Whole)', 352, 24.6, 60.1, 1.1, 'raw'],
  ['r_88', 'Pigeon Pea (Toor Whole)', 343, 21.7, 62.8, 1.5, 'raw'],
  ['r_89', 'Kidney Beans (Rajma Raw)', 333, 23.6, 60.0, 0.8, 'raw'],
  ['r_90', 'Cowpea (Lobia/Chawli Raw)', 336, 23.5, 60.0, 1.2, 'raw'],
  ['r_91', 'Chickpeas (Kabuli Chana Raw)', 364, 19.3, 60.6, 6.0, 'raw'],
  ['r_92', 'Dry Peas (Matar Raw)', 341, 24.5, 60.4, 1.2, 'raw'],
  ['r_93', 'Black Eyed Peas (Raw)', 336, 23.5, 60.0, 1.2, 'raw'],
  ['r_94', 'Palm Jaggery (Karupatti)', 383, 0.4, 95.0, 0.1, 'sugar_oil'],
  ['r_95', 'Coconut Sugar', 375, 1.0, 92.0, 0.0, 'sugar_oil'],
  ['r_96', 'Rock Sugar (Mishri)', 395, 0.0, 99.5, 0.0, 'sugar_oil'],
  ['r_97', 'Stevia Leaf Powder', 0, 0.0, 0.0, 0.0, 'sugar_oil'],
  ['r_98', 'Dry Ginger (Saunth)', 335, 9.0, 71.6, 4.2, 'sugar_oil'],
  ['r_99', 'Nigella Seeds (Kalonji)', 345, 16.0, 52.0, 15.0, 'sugar_oil'],
  ['r_100', 'Fenugreek Leaves (Kasuri Methi Dry)', 315, 22.0, 48.0, 4.0, 'sugar_oil'],

  // --- 6. Sweets & Snacks (IDs 51-100) ---
  ['sn_51', 'Thekua', 485, 5.5, 65.0, 22.5, 'solid'],
  ['sn_52', 'Anarsa', 425, 4.5, 72.0, 14.5, 'solid'],
  ['sn_53', 'Patishapta (Coconut Filled)', 215, 4.0, 38.0, 5.5, 'solid'],
  ['sn_54', 'Bebinca (Goan Layered Sweet)', 365, 5.5, 42.0, 21.0, 'solid'],
  ['sn_55', 'Qubani Ka Meetha (Apricot Dessert)', 195, 2.5, 48.0, 0.5, 'solid'],
  ['sn_56', 'Pootharekulu (Paper Sweet)', 385, 3.5, 78.0, 8.0, 'solid'],
  ['sn_57', 'Petha (Agra Sweet, Dry)', 320, 0.5, 78.0, 0.2, 'solid'],
  ['sn_58', 'Khaja', 495, 4.5, 62.0, 26.5, 'solid'],
  ['sn_59', 'Gavvalu (Sweet Shells)', 465, 5.5, 68.0, 19.5, 'solid'],
  ['sn_60', 'Peanut Pakoda (Palli Pakodi)', 545, 18.5, 38.0, 36.5, 'solid'],
  ['sn_61', 'Ribbon Pakoda', 485, 8.5, 58.0, 25.5, 'solid'],
  ['sn_62', 'Karanji (Gujiya)', 455, 6.5, 55.0, 24.5, 'solid'],
  ['sn_63', 'Nankhatai (Indian Cookie)', 525, 6.5, 54.0, 32.5, 'solid'],
  ['sn_64', 'Peda (Dharwad)', 385, 14.5, 52.0, 14.5, 'solid'],
  ['sn_65', 'Malpua (Syrup Soaked)', 345, 5.5, 52.0, 12.5, 'solid'],
  ['sn_66', 'Imarti', 315, 4.5, 65.0, 5.5, 'solid'],
  ['sn_67', 'Kaju Roll', 475, 12.5, 50.0, 26.0, 'solid'],
  ['sn_68', 'Dodha Barfi', 415, 8.5, 54.0, 19.5, 'solid'],
  ['sn_69', 'Milk Cake (Alwar Ka Mawa)', 395, 14.0, 48.0, 16.5, 'solid'],
  ['sn_70', 'Coconut Ladoo', 425, 4.5, 55.0, 22.5, 'solid'],
  ['sn_71', 'Rava Ladoo', 385, 5.5, 68.0, 11.5, 'solid'],
  ['sn_72', 'Panjiri', 465, 8.5, 52.0, 25.5, 'solid'],
  ['sn_73', 'Pinni', 495, 9.5, 48.0, 31.5, 'solid'],
  ['sn_74', 'Gajak (Sesame & Jaggery)', 485, 12.5, 58.0, 24.5, 'solid'],
  ['sn_75', 'Rewari', 465, 11.5, 62.0, 21.5, 'solid'],
  ['sn_76', 'Singhada Barfi', 345, 3.5, 75.0, 4.5, 'solid'],
  ['sn_77', 'Lauki Halwa', 215, 3.5, 32.0, 8.5, 'curry_dal'],
  ['sn_78', 'Badam Halwa', 465, 10.5, 45.0, 28.5, 'curry_dal'],
  ['sn_79', 'Karachi Halwa (Bombay Halwa)', 345, 0.5, 75.0, 6.5, 'solid'],
  ['sn_80', 'Mihidana', 335, 4.5, 68.0, 6.5, 'solid'],
  ['sn_81', 'Sitabhog', 315, 5.5, 62.0, 5.5, 'solid'],
  ['sn_82', 'Jolbhora Sandesh', 295, 12.0, 38.0, 10.5, 'solid'],
  ['sn_83', 'Ledikeni', 285, 6.5, 54.0, 5.5, 'solid'],
  ['sn_84', 'Rosogolla (Sponge)', 225, 5.5, 48.0, 1.5, 'solid'],
  ['sn_85', 'Chenna Poda', 315, 12.5, 36.0, 14.5, 'solid'],
  ['sn_86', 'Ariselu', 415, 4.5, 72.0, 13.5, 'solid'],
  ['sn_87', 'Sunnundalu (Urad Dal Ladoo)', 465, 16.5, 58.0, 19.5, 'solid'],
  ['sn_88', 'Bandar Ladoo', 425, 8.5, 62.0, 16.5, 'solid'],
  ['sn_89', 'Kakinada Kaja', 475, 5.5, 65.0, 22.5, 'solid'],
  ['sn_90', 'Putharekulu (Dry Fruit)', 415, 6.5, 72.0, 12.5, 'solid'],
  ['sn_91', 'Medu Pakoda', 385, 9.5, 45.0, 19.5, 'solid'],
  ['sn_92', 'Maddur Vada', 415, 7.5, 48.0, 22.5, 'solid'],
  ['sn_93', 'Congress Kadalekai (Spiced Peanuts)', 565, 21.5, 24.0, 44.5, 'raw'],
  ['sn_94', 'Benne Murukku (Butter Murukku)', 515, 7.5, 52.0, 31.5, 'solid'],
  ['sn_95', 'Kodubale', 495, 8.5, 56.0, 27.5, 'solid'],
  ['sn_96', 'Khara Boondi', 485, 11.5, 48.0, 28.5, 'raw'],
  ['sn_97', 'Makhana (Caramelized/Sweet)', 415, 6.5, 82.0, 6.5, 'raw'],
  ['sn_98', 'Diet Chivda (Roasted Poha, Low Oil)', 385, 8.5, 75.0, 5.5, 'raw'],
  ['sn_99', 'Soya Sticks', 425, 18.5, 56.0, 14.5, 'raw'],
  ['sn_100', 'Quinoa Puffs', 395, 12.5, 68.0, 8.5, 'raw']
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

const generateDatabaseBatch2 = () => {
  console.log('Generating Batch 2: 300 highly accurate Indian food items...');
  
  const formattedDatabase = rawData2.map(([id, name, cal, pro, carb, fat, type]) => {
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

  const outputPath = path.join(__dirname, '../src/db/indianFoodsSeed_Part2.json');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(formattedDatabase, null, 2));
  console.log(`Successfully wrote 300 structured items to ${outputPath}`);
};

generateDatabaseBatch2();
