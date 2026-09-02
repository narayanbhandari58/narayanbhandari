const questions = [
  { q: "नेपालको सबैभन्दा अग्लो हिमाल कुन हो?", options: ["धौलागिरी", "कञ्चनजङ्घा", "सगरमाथा", "मकालु"], correct: 2 },
  { q: "नेपालको राजधानी कुन हो?", options: ["काठमाडौं", "पोखरा", "ललितपुर", "भरतपुर"], correct: 0 },
  { q: "नेपालको राष्ट्रिय फूल कुन हो?", options: ["लालीगुराँस", "सिरिस", "साल", "चम्पा"], correct: 0 },
  { q: "नेपालमा जम्मा कति प्रदेश छन्?", options: ["५", "६", "७", "८"], correct: 2 },
  { q: "नेपालको राष्ट्रिय जनावर कुन हो?", options: ["गाई", "भैंसी", "कुकुर", "हात्ती"], correct: 0 }
];

let currentQuestion = 0;
let score = 0;
let userAnswers = Array(questions.length).fill(null);

const quizContainer = document.getElementById("quiz-container");
const progressText = document.getElementById("progress-text");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const finishBtn = document.getElementById("finish-btn");

function loadQuiz() {
  quizContainer.innerHTML = "";
  questions.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.innerHTML = `
      <h3>${i + 1}. ${q.q}</h3>
      <div class="options">
        ${q.options.map((opt, idx) => `<button onclick="selectOption(${i}, ${idx})">${opt}</button>`).join("")}
      </div>
      <button class="show-result-btn" onclick="showPartialResult()">See Your Result</button>
    `;
    quizContainer.appendChild(card);
  });
  updateSlide();
}

function selectOption(qIndex, optIndex) {
  const question = questions[qIndex];
  const options = document.querySelectorAll(`.question-card:nth-child(${qIndex + 1}) .options button`);
  // disable all options
  options.forEach(btn => btn.disabled = true);
  userAnswers[qIndex] = optIndex;

  if (optIndex === question.correct) {
    options[optIndex].classList.add("correct");
    score += 2;
  } else {
    options[optIndex].classList.add("wrong");
    options[question.correct].classList.add("correct");
    score -= 0.2;
  }
}

function updateSlide() {
  quizContainer.style.transform = `translateX(-${currentQuestion * 100}%)`;
  progressText.innerHTML = `${currentQuestion + 1} / ${questions.length}`;
  prevBtn.style.display = currentQuestion === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestion === questions.length - 1 ? "none" : "inline-block";
  finishBtn.style.display = currentQuestion === questions.length - 1 ? "inline-block" : "none";
}

nextBtn.onclick = () => {
  if (currentQuestion < questions.length - 1) currentQuestion++;
  updateSlide();
};

prevBtn.onclick = () => {
  if (currentQuestion > 0) currentQuestion--;
  updateSlide();
};

finishBtn.onclick = showResult;

function showResult() {
  showPartialResult(true);
}

function showPartialResult(isFinal = false) {
  let total = questions.length * 2;
  let percent = (score / total) * 100;
  let pass = percent >= 40;

  let detailHTML = "";
  const upto = isFinal ? questions.length : currentQuestion + 1;

  for (let i = 0; i < upto; i++) {
    let userAns = userAnswers[i];
    let correctAns = questions[i].correct;
    detailHTML += `
      <p><b>${i + 1}. ${questions[i].q}</b><br>
      तपाईंको उत्तर: ${userAns !== null ? questions[i].options[userAns] : "छाडिएको"}<br>
      सही उत्तर: ${questions[i].options[correctAns]}</p>
    `;
  }

  document.getElementById("popup-overlay").style.display = "flex";
  document.getElementById("popup-title").innerHTML = isFinal
    ? (pass ? "🎉 बधाई छ!" : "😢 अझै प्रयास गर्नुहोस्!")
    : `अहिलेसम्मको Result (Q1 - Q${upto})`;
  document.getElementById("popup-detail").innerHTML = detailHTML;
}

function closePopup() {
  document.getElementById("popup-overlay").style.display = "none";
}

loadQuiz();
