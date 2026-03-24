# Tax Master AI 🌍💰

יועץ מס גלובלי מבוסס AI - מכיר את כל החוקים בכל המדינות.

## הפעלה מהירה

### 1. הגדר API Key

ערוך את הקובץ `backend/.env` והוסף את ה-ANTHROPIC_API_KEY שלך:
```
ANTHROPIC_API_KEY=sk-ant-...
```

קבל מפתח בחינם: https://console.anthropic.com

### 2. הפעל Backend (Python)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend יהיה זמין בכתובת: http://localhost:8000

### 3. הפעל Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

פתח דפדפן: http://localhost:3000

---

## אופציונלי: Web Search בזמן אמת

כדי שהסוכן יוכל לחפש מידע מס עדכני:

1. קבל מפתח חינמי מ-Tavily: https://tavily.com
2. הוסף ל-`backend/.env`:
```
TAVILY_API_KEY=tvly-...
```

---

## יכולות

- **26+ מדינות** בבסיס הנתונים עם שיעורי מס מלאים
- **15+ משטרי מס מיוחדים**: UAE Golden Visa, Cyprus Non-Dom, Portugal IFICI, Italy €100k Flat Tax, Israel Oleh Exemption, Swiss Lump-Sum, Malta Non-Dom, ועוד
- **חישובי מס** - השוואה בין מדינות עם מספרים קונקרטיים
- **אמנות מס** בין מדינות
- **חיפוש ווב** לחוקים עדכניים (עם Tavily API)
- **Claude Opus 4 + Adaptive Thinking** לאנליזה עמוקה

## ארכיטקטורה

```
frontend/ (Next.js)    →    backend/ (FastAPI)    →    Claude Opus 4
                                     ↓
                            5 tools:
                            - web_search
                            - get_country_tax_profile
                            - get_special_regime_details
                            - calculate_tax_scenario
                            - lookup_tax_treaty
```
