-- Sample app data for testing
INSERT INTO apps (app_id, name, developer_name, primary_category, short_description, full_description, icon_url_512, app_store_url, rating_average, rating_count, price, is_free, is_active) VALUES
('1', 'FitTrack Pro', 'HealthTech Studios', 'Health & Fitness', 'Comprehensive fitness tracking app', 'Track your workouts, monitor your progress, and achieve your fitness goals with our comprehensive fitness tracking app. Features include workout logging, progress photos, nutrition tracking, and personalized workout plans.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/fittrack-pro/id1', 4.5, 2150, 0.00, true, true),

('2', 'Mindful Moments', 'Zen Apps Inc', 'Health & Fitness', 'Daily meditation and mindfulness', 'Find peace and clarity with guided meditations, breathing exercises, and mindfulness practices designed for busy lifestyles. Perfect for stress reduction and mental well-being.', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/mindful-moments/id2', 4.7, 3420, 4.99, false, true),

('3', 'TaskMaster', 'Productivity Labs', 'Productivity', 'Advanced task management', 'Get things done with our powerful task management system. Features include project organization, deadline tracking, team collaboration, and smart notifications.', 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/taskmaster/id3', 4.2, 1890, 0.00, true, true),

('4', 'Healthy Eats', 'NutriDev', 'Food & Drink', 'Healthy recipe discovery', 'Discover delicious and nutritious recipes tailored to your dietary preferences. Includes meal planning, grocery lists, and nutritional information.', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/healthy-eats/id4', 4.4, 2760, 2.99, false, true),

('5', 'Active Life', 'Outdoor Adventures LLC', 'Health & Fitness', 'Outdoor activity tracking', 'Track your outdoor adventures with GPS logging, route planning, and activity sharing. Perfect for hikers, runners, and outdoor enthusiasts.', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/active-life/id5', 4.3, 1650, 0.00, true, true),

('6', 'FocusFlow', 'Deep Work Solutions', 'Productivity', 'Pomodoro and focus timer', 'Boost your productivity with scientifically-backed focus techniques. Features Pomodoro timers, distraction blocking, and productivity analytics.', 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/focusflow/id6', 4.6, 2980, 1.99, false, true),

('7', 'BudgetBuddy', 'FinanceFirst', 'Finance', 'Personal finance tracking', 'Take control of your finances with expense tracking, budget planning, and financial goal setting. Secure and easy to use.', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/budgetbuddy/id7', 4.1, 4230, 0.00, true, true),

('8', 'SleepWell', 'DreamTech', 'Health & Fitness', 'Sleep tracking and improvement', 'Improve your sleep quality with smart sleep tracking, bedtime routines, and relaxing soundscapes. Wake up refreshed every day.', 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/sleepwell/id8', 4.5, 3150, 3.99, false, true),

('9', 'Language Learning Plus', 'EduSoft International', 'Education', 'Interactive language learning', 'Master new languages with interactive lessons, speech recognition, and cultural insights. Supports 20+ languages.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/language-learning-plus/id9', 4.4, 5670, 9.99, false, true),

('10', 'Travel Planner Pro', 'Wanderlust Apps', 'Travel', 'Complete travel planning', 'Plan your perfect trip with itinerary creation, booking management, and local recommendations. Your travel companion.', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=512&h=512&fit=crop&crop=center', 'https://apps.apple.com/app/travel-planner-pro/id10', 4.7, 2890, 6.99, false, true);

-- AI insights for the sample apps
INSERT INTO app_ai_insights (app_id, one_liner_generic, problem_tags, lifestyle_tags) 
SELECT 
  apps.id,
  CASE apps.app_id
    WHEN '1' THEN 'If you love staying active, this app tracks every workout and celebrates your progress.'
    WHEN '2' THEN 'If you feel stressed daily, this app brings calm with guided meditations.'
    WHEN '3' THEN 'If you struggle with organization, this app turns chaos into clarity.'
    WHEN '4' THEN 'If you want to eat healthier, this app makes nutritious cooking simple and delicious.'
    WHEN '5' THEN 'If you love outdoor adventures, this app maps your journeys and tracks your achievements.'
    WHEN '6' THEN 'If you get distracted easily, this app helps you focus and get things done.'
    WHEN '7' THEN 'If you want to save money, this app shows exactly where your dollars go.'
    WHEN '8' THEN 'If you have trouble sleeping, this app guides you to better rest.'
    WHEN '9' THEN 'If you want to learn languages, this app makes it fun and interactive.'
    WHEN '10' THEN 'If you love to travel, this app organizes every detail of your perfect trip.'
  END,
  CASE apps.app_id
    WHEN '1' THEN ARRAY['fitness tracking', 'workout logging', 'health monitoring', 'exercise motivation']
    WHEN '2' THEN ARRAY['stress relief', 'meditation', 'mental health', 'relaxation', 'mindfulness']
    WHEN '3' THEN ARRAY['task management', 'organization', 'productivity', 'project planning']
    WHEN '4' THEN ARRAY['healthy eating', 'recipe discovery', 'meal planning', 'nutrition']
    WHEN '5' THEN ARRAY['outdoor activities', 'gps tracking', 'hiking', 'running', 'adventure']
    WHEN '6' THEN ARRAY['focus', 'concentration', 'pomodoro', 'productivity', 'distraction blocking']
    WHEN '7' THEN ARRAY['budgeting', 'expense tracking', 'financial planning', 'money management']
    WHEN '8' THEN ARRAY['sleep tracking', 'sleep improvement', 'bedtime routine', 'relaxation']
    WHEN '9' THEN ARRAY['language learning', 'education', 'skill development', 'communication']
    WHEN '10' THEN ARRAY['travel planning', 'itinerary', 'booking management', 'trip organization']
  END,
  CASE apps.app_id
    WHEN '1' THEN ARRAY['active', 'fitness', 'health-focused']
    WHEN '2' THEN ARRAY['wellness', 'mindful', 'busy professional']
    WHEN '3' THEN ARRAY['professional', 'organized', 'productive']
    WHEN '4' THEN ARRAY['health-conscious', 'foodie', 'family-oriented']
    WHEN '5' THEN ARRAY['adventurous', 'outdoor enthusiast', 'active']
    WHEN '6' THEN ARRAY['professional', 'student', 'productivity-focused']
    WHEN '7' THEN ARRAY['budget-conscious', 'financially responsible', 'planner']
    WHEN '8' THEN ARRAY['health-focused', 'wellness', 'self-care']
    WHEN '9' THEN ARRAY['student', 'traveler', 'culturally curious']
    WHEN '10' THEN ARRAY['traveler', 'planner', 'adventurous']
  END
FROM apps
WHERE apps.app_id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10');