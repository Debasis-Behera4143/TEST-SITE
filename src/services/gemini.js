import { GoogleGenerativeAI } from '@google/generative-ai';

// Retrieve Gemini API Key from Vite environment variables
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const generateAIEvaluationFeedback = async ({
  subject,
  marks,
  totalMarks,
  teacherRemarks
}) => {
  if (!geminiApiKey || geminiApiKey === 'YOUR_GEMINI_API_KEY') {
    console.warn("[EduTrack AI]: VITE_GEMINI_API_KEY is not configured. Falling back to local diagnostic generator.");
    return getFallbackFeedback(subject, marks, totalMarks, teacherRemarks);
  }

  try {
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert Class 10 academic tutor and AI diagnostic assistant for a smart exam portal.
      Analyze the student's exam performance and generate professional, constructive, and highly detailed feedback.

      INPUT DETAILS:
      - Subject: ${subject}
      - Marks Obtained: ${marks} / ${totalMarks}
      - Teacher Remarks: "${teacherRemarks}"

      Please generate a response strictly formatted in JSON. Do not include any markdown fences or extra text, just the raw JSON object matching this structure:
      {
        "studentFeedback": "A direct message to the student explaining what they did well and where they can improve, using a encouraging, mentoring tone.",
        "parentFeedback": "A professional update to the parent summarizing their child's conceptual grasp and suggestions for home support.",
        "strengths": ["At least two specific academic strengths observed in this subject or remark."],
        "weakAreas": ["At least two specific academic areas needing attention or revision based on the marks/remarks."],
        "improvementSuggestions": ["Three specific, actionable study tips or remediation steps."],
        "revisionPlan": "A brief, structured study schedule or list of topics to review over the next 7 days.",
        "motivationMessage": "An inspiring, growth-mindset message to keep the student motivated."
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("[EduTrack AI]: Gemini API error: ", error);
    return getFallbackFeedback(subject, marks, totalMarks, teacherRemarks);
  }
};

// Return standard deterministic fallback diagnostic if key is missing (ensuring robustness)
const getFallbackFeedback = (subject, marks, totalMarks, teacherRemarks) => {
  const percentage = ((marks / totalMarks) * 100).toFixed(0);
  const isPassing = percentage >= 60;

  return {
    studentFeedback: `You obtained ${marks}/${totalMarks} (${percentage}%) in ${subject}. ${
      isPassing 
        ? "You have a good grasp of the foundational concepts, but pay closer attention to presentation and step-by-step reasoning."
        : "Let's work together to strengthen your foundations in this subject. Review the textbook exercises and practice past question papers."
    } Remarks: "${teacherRemarks}"`,
    parentFeedback: `Your child scored ${marks}/${totalMarks} in the recent ${subject} test. We recommend encouraging daily practice of practice tests and focusing on the areas highlighted by the teacher: "${teacherRemarks}"`,
    strengths: [
      `Familiarity with standard ${subject} guidelines and concepts.`,
      `Completed test submission and followed basic formatting.`
    ],
    weakAreas: [
      `Step-by-step derivation details and numerical accuracy.`,
      `Time management during the examination.`
    ],
    improvementSuggestions: [
      "Dedicate 30 minutes daily to practicing numerical or formula derivations.",
      "Solve at least one mock chapter quiz under timed conditions.",
      "Seek immediate clarification from your instructor on weak topics."
    ],
    revisionPlan: "Days 1-3: Review theory and solved examples. Days 4-5: Solve textbook back-chapter questions. Days 6-7: Take a self-graded mock test.",
    motivationMessage: "Success is a journey of small, consistent steps. Keep practicing, and you will see your scores soar!"
  };
};
