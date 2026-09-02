# नारायण भण्डारी वेबसाइट — Fixed Version

## मुख्य सुधार
- `image/logo.png` को सही path मा मिलाइएको।
- लोकसेवा quiz को `js/script.js` path समस्या हटाइएको।
- मुख्य वेबसाइटबाट `localStorage` हटाएर server-backed post API प्रयोग गरिएको।
- Admin को GitHub token browser code मा नराखी Netlify Environment Variable मा सारिएको।
- हराएका admin functions (edit/delete/media/change-password आदि) को असंगत संरचना हटाएर working, सुरक्षित login/editor बनाइएको।
- Posts को `posts/index.json` index बनाइएको।
- Featured image र TinyMCE image upload server-side GitHub API मार्फत।
- Like/comment लाई server-side post data मा राखिएको।
- Contact form लाई Netlify Forms मा राखिएको, ताकि visitor को सन्देश public Git repository मा नपरोस्।
- Responsive mobile navigation र error/loading states सुधारिएको।

## Netlify setup
1. यो project GitHub repository मा push गर्नुहोस्।
2. Netlify मा यही repository deploy गर्नुहोस्।
3. Netlify → Site configuration → Environment variables मा `.env.example` का सबै variables राख्नुहोस्।
4. **पुरानो GitHub token तुरुन्त revoke गर्नुहोस् र नयाँ fine-grained token बनाउनुहोस्।** नयाँ token मा आवश्यक repository Contents permission मात्र दिनुहोस्।
5. Deploy/redeploy गर्नुहोस्।
6. `/admin.html` खोलेर `ADMIN_USERNAME` र `ADMIN_PASSWORD` ले login गर्नुहोस्।

## महत्वपूर्ण
यो package मा कुनै वास्तविक GitHub token वा पुरानो password राखिएको छैन।
