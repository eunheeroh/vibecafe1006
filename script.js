// ==========================================================
// 0. Supabase 설정 (URL 및 API KEY)
// ==========================================================
// Supabase 프로젝트의 Project URL과 anon public key를 아래 따옴표 안에 직접 넣어주세요.
const SUPABASE_URL = "https://wlywjxklcwcdnkseudzu.supabase.co"; // 예: "https://xyzcompany.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseXdqeGtsY3djZG5rc2V1ZHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NzA3MjQsImV4cCI6MjEwNjE0NjcyNH0.0h3sT-uP4Axqk7Yxf0YzcxXogWC_acg2_6q4TwGS53Y"; // 예: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Supabase 클라이언트 객체 생성 (변수명: supabaseClient)
// CDN으로 불러온 window.supabase 라이브러리의 createClient 함수를 사용합니다.
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;


// ==========================================================
// 1. DOM 요소 가져오기 (HTML 요소들을 JavaScript 변수로 연결)
// ==========================================================

// 주문 폼 및 버튼
const orderForm = document.getElementById("orderForm");
const submitBtn = document.getElementById("submitBtn");             // 주문하기 버튼 (비활성화 제어용)
const resetBtn = document.getElementById("resetBtn");               // 다시 작성 버튼

// 입력 필드들
const customerNameInput = document.getElementById("customerName"); // 이름 입력 필드
const customerTelInput = document.getElementById("customerTel");   // 전화번호 입력 필드
const beverageSelect = document.getElementById("beverage");         // 음료 선택 드롭다운
const quantityInput = document.getElementById("quantity");         // 수량 입력 필드
const requestsTextarea = document.getElementById("requests");       // 요청사항 필드

// 금액 및 결과 메시지 표시 영역
const totalPriceSpan = document.getElementById("totalPrice");             // 예상 금액 숫자 표시 span
const orderConfirmation = document.getElementById("orderConfirmation");   // 주문 확인 메시지 박스

// 라디오 버튼 및 체크박스 그룹
const sizeRadios = document.querySelectorAll('input[name="size"]');       // 사이즈 라디오 버튼 목록
const optionCheckboxes = document.querySelectorAll('input[name="option"]'); // 추가 옵션 체크박스 목록

// 탭 버튼 및 탭 컨텐츠 영역
const tabOrderBtn = document.getElementById("tabOrderBtn");         // 주문하기 탭 버튼
const tabHistoryBtn = document.getElementById("tabHistoryBtn");     // 주문 내역 탭 버튼
const orderTabContent = document.getElementById("orderTabContent"); // 주문하기 화면 영역
const historyTabContent = document.getElementById("historyTabContent"); // 주문 내역 화면 영역
const orderBadge = document.getElementById("orderBadge");           // 주문 내역 건수 뱃지

// 주문 내역 관련 요소
const ordersList = document.getElementById("ordersList");                   // 주문 카드 목록 컨테이너
const ordersSummaryArea = document.getElementById("ordersSummaryArea");     // 총 주문 금액 요약 영역
const totalOrdersSummary = document.getElementById("totalOrdersSummary");   // 총 주문 금액 텍스트 표시
const clearAllBtn = document.getElementById("clearAllBtn");                 // 내역 모두 지우기 버튼


// ==========================================================
// 2. 상태 관리 변수 (주문 내역 배열 및 주문 번호 카운터)
// ==========================================================
let orders = [];        // 주문 객체들을 저장할 배열
let nextOrderId = 1;    // 1부터 1씩 증가하는 고유 주문 번호


// ==========================================================
// 3. 총 예상 금액 계산 함수 (calculateTotal)
// ==========================================================
/**
 * 음료, 사이즈, 추가 옵션, 수량을 확인하여 총 예상 금액을 계산하고
 * 화면의 "예상 금액: 0원" 영역에 콤마가 포함된 금액으로 표시하는 함수입니다.
 * @returns {number} 계산된 총 금액 (원 단위 숫자)
 */
function calculateTotal() {
  // (1) 음료 선택 확인
  const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
  const beveragePrice = Number(selectedOption.dataset.price) || 0;

  // 음료를 아직 선택하지 않은 경우(기본 안내 옵션) 총 금액은 무조건 0원으로 표시
  if (!beverageSelect.value || beveragePrice === 0) {
    totalPriceSpan.textContent = "0";
    return 0;
  }

  // (2) 사이즈 추가 금액 확인
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizePrice = selectedSize ? (Number(selectedSize.dataset.price) || 0) : 0;

  // (3) 추가 옵션 추가 금액 확인
  const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
  let optionsPrice = 0;
  checkedOptions.forEach((option) => {
    optionsPrice += Number(option.dataset.price) || 0;
  });

  // (4) 수량 확인 (숫자 변환, 1 미만이거나 비어있으면 1로 보정)
  let quantity = parseInt(quantityInput.value, 10);
  if (isNaN(quantity) || quantity < 1) {
    quantity = 1;
  }

  // (5) 1잔당 단가 = 음료 기본가 + 사이즈 추가금 + 옵션 총액
  const unitPrice = beveragePrice + sizePrice + optionsPrice;

  // (6) 총 예상 금액 = 1잔당 단가 * 수량
  const total = unitPrice * quantity;

  // (7) toLocaleString()으로 천 단위 콤마(,) 표시
  totalPriceSpan.textContent = total.toLocaleString();

  return total;
}


// ==========================================================
// 4. 주문 내역 목록 화면 렌더링 함수 (renderOrders)
// ==========================================================
/**
 * orders 배열의 데이터를 읽어와서 주문 내역 카드 목록과
 * 상단 뱃지 숫자, 하단 총 주문 금액을 화면에 다시 그리는 함수입니다.
 * [보안 조건]: 사용자가 입력한 문자열은 innerHTML 대신 textContent로 안전하게 삽입합니다.
 */
function renderOrders() {
  // (1) 탭 옆의 주문 건수 뱃지 숫자 갱신
  orderBadge.textContent = orders.length;

  // (2) 기존 주문 카드 목록 초기화
  ordersList.innerHTML = "";

  // (3) 주문 내역이 없을 때: 안내 문구 표시 및 요약 영역 숨기기
  if (orders.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "empty-orders";
    emptyNotice.textContent = "아직 주문 내역이 없어요 ☕";
    ordersList.appendChild(emptyNotice);

    // 요약 영역 숨김 (hidden 클래스 재사용)
    ordersSummaryArea.classList.add("hidden");
    return;
  }

  // (4) 주문 내역이 있을 때: 요약 영역 표시
  ordersSummaryArea.classList.remove("hidden");

  // (5) orders 배열을 순회하며 각 주문 카드 DOM 생성
  orders.forEach((order) => {
    // [카드 컨테이너] 베이지 배경, 왼쪽 갈색 세로줄
    const card = document.createElement("div");
    card.className = "order-card";

    // [우측 상단 취소 버튼]
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-cancel-order";
    cancelBtn.textContent = "취소";
    cancelBtn.addEventListener("click", () => {
      // confirm으로 삭제 여부 재확인
      if (confirm(`#${order.orderId} 주문을 취소하시겠습니까?`)) {
        deleteOrder(order.orderId);
      }
    });
    card.appendChild(cancelBtn);

    // [1번째 줄]: "#1 홍길동님 · 5,000원"
    const line1 = document.createElement("div");
    line1.className = "order-card-header";
    line1.textContent = `#${order.orderId} ${order.name}님 · ${order.totalPrice.toLocaleString()}원`;
    card.appendChild(line1);

    // [2번째 줄]: "카페라떼 M사이즈 (샷 추가) 1잔"
    const line2 = document.createElement("div");
    line2.className = "order-card-details";
    const optionText = order.options && order.options.length > 0 ? ` (${order.options.join(", ")})` : "";
    line2.textContent = `${order.beverage} ${order.size}사이즈${optionText} ${order.quantity}잔`;
    card.appendChild(line2);

    // [3번째 줄]: 요청사항(있을 때만) · 주문 시간
    const line3 = document.createElement("div");
    line3.className = "order-card-meta";
    if (order.requests) {
      line3.textContent = `${order.requests} · ${order.orderTime}`;
    } else {
      line3.textContent = order.orderTime;
    }
    card.appendChild(line3);

    // 생성된 카드를 목록 컨테이너에 추가
    ordersList.appendChild(card);
  });

  // (6) 하단 총 주문 금액 및 총 건수 계산
  const grandTotal = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  totalOrdersSummary.textContent = `총 주문 금액: ${grandTotal.toLocaleString()}원 (${orders.length}건)`;
}


// ==========================================================
// 5. 주문 단건 취소 및 전체 내역 삭제 함수
// ==========================================================
/**
 * 특정 주문번호의 주문을 orders 배열에서 제거하고 목록을 다시 그립니다.
 * @param {number} orderIdToDelete 취소할 주문의 번호
 */
function deleteOrder(orderIdToDelete) {
  orders = orders.filter((order) => order.orderId !== orderIdToDelete);
  renderOrders();
}

// 내역 모두 지우기 버튼 클릭 이벤트
clearAllBtn.addEventListener("click", () => {
  if (orders.length === 0) return;

  if (confirm("모든 주문 내역을 삭제하시겠습니까?")) {
    orders = [];
    renderOrders();
  }
});


// ==========================================================
// 6. 탭 전환 기능 (주문하기 ↔ 주문 내역)
// ==========================================================
/**
 * 지정된 탭으로 화면을 전환하는 함수입니다.
 * @param {'order' | 'history'} tabName 전환할 탭 이름
 */
function switchTab(tabName) {
  if (tabName === "order") {
    // 주문하기 탭 활성화
    tabOrderBtn.classList.add("active");
    tabHistoryBtn.classList.remove("active");

    orderTabContent.classList.remove("hidden");
    historyTabContent.classList.add("hidden");
  } else if (tabName === "history") {
    // 주문 내역 탭 활성화
    tabHistoryBtn.classList.add("active");
    tabOrderBtn.classList.remove("active");

    historyTabContent.classList.remove("hidden");
    orderTabContent.classList.add("hidden");

    // 주문 내역 탭을 열 때 최신 상태로 렌더링
    renderOrders();
  }
}

// 탭 버튼 클릭 이벤트 연결
tabOrderBtn.addEventListener("click", () => switchTab("order"));
tabHistoryBtn.addEventListener("click", () => switchTab("history"));


// ==========================================================
// 7. 실시간 변경 이벤트 리스너 등록
// ==========================================================
beverageSelect.addEventListener("change", calculateTotal);

sizeRadios.forEach((radio) => {
  radio.addEventListener("change", calculateTotal);
});

optionCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", calculateTotal);
});

quantityInput.addEventListener("input", calculateTotal);
quantityInput.addEventListener("change", calculateTotal);


// ==========================================================
// 8. 주문하기 (Form Submit) 이벤트 처리 및 Supabase 저장
// ==========================================================
orderForm.addEventListener("submit", async function (e) {
  e.preventDefault(); // 기본 새로고침 방지

  // (1) 이름 필수 입력 검증
  const customerName = customerNameInput.value.trim();
  if (!customerName) {
    alert("이름을 입력해주세요");
    customerNameInput.focus();
    return;
  }

  // (2) 음료 선택 검증
  if (!beverageSelect.value) {
    alert("음료를 선택해주세요");
    beverageSelect.focus();
    return;
  }

  // (3) 총 금액 최종 계산
  const total = calculateTotal();

  // (4) 주문 항목 데이터 추출
  // - 음료 정보 (이름 및 단품 기본 가격)
  const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
  const beverageName = selectedOption.text.split("(")[0].trim();
  const beveragePrice = Number(selectedOption.dataset.price) || 0;

  // - 사이즈
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizeValue = selectedSize ? selectedSize.value : "M";
  const sizeText = `${sizeValue}사이즈`;

  // - 추가 옵션 목록 (배열 형태로 추출)
  const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
  const optionNames = [];
  checkedOptions.forEach((option) => {
    const label = document.querySelector(`label[for="${option.id}"]`);
    if (label) {
      optionNames.push(label.textContent.split("(")[0].trim());
    }
  });

  // - 옵션 문구 (화면 메시지용 괄호 포함 문자열)
  const optionsText = optionNames.length > 0 ? ` (${optionNames.join(", ")})` : "";

  // - 수량 및 기타 입력값
  const quantity = parseInt(quantityInput.value, 10) || 1;
  const phoneText = customerTelInput.value.trim();
  const requestText = requestsTextarea.value.trim();

  // (5) 버튼 비활성화 (두 번 눌리지 않도록 방지)
  submitBtn.disabled = true;
  const originalBtnText = submitBtn.textContent;
  submitBtn.textContent = "주문 저장 중...";

  try {
    // (6) Supabase 클라이언트 확인
    if (!supabaseClient) {
      throw new Error("Supabase 클라이언트가 초기화되지 않았습니다. CDN 연결을 확인해주세요.");
    }

    // (7) Supabase cafe_menu03 테이블에 주문 데이터 INSERT
    const { data, error } = await supabaseClient
      .from("cafe_menu03")
      .insert([
        {
          customer_name: customerName,
          phone: phoneText,
          drink: beverageName,
          drink_price: beveragePrice,
          size: sizeValue,
          options: optionNames, // 배열 형태 저장
          quantity: quantity,
          request: requestText,
          total_price: total,
        },
      ])
      .select();

    // 에러 발생 시 예외 발생
    if (error) {
      throw error;
    }

    // (8) 저장 성공 시 처리
    // - 현재 시간 생성 (예: "오후 9:35")
    const now = new Date();
    const orderTimeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // - 로컬 orders 배열에 추가 (최신 주문이 맨 위에 오도록 unshift)
    const newOrder = {
      orderId: (data && data[0] && data[0].id) ? data[0].id : nextOrderId++,
      name: customerName,
      beverage: beverageName,
      size: sizeValue,
      options: optionNames,
      quantity: quantity,
      requests: requestText,
      totalPrice: total,
      orderTime: orderTimeStr,
    };
    orders.unshift(newOrder);

    // - 주문 내역 목록 및 뱃지 화면 갱신
    renderOrders();

    // - 기존 주문 확인 메시지 표시
    const resultMessage = `${customerName}님, ${beverageName} ${sizeText}${optionsText} ${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;
    orderConfirmation.textContent = resultMessage;
    orderConfirmation.style.display = "block";

    // 확인 메시지로 부드럽게 화면 이동
    orderConfirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });

  } catch (err) {
    // (9) 저장 실패 시 처리
    console.error("주문 저장 실패:", err);
    alert("주문 저장에 실패했어요");
  } finally {
    // (10) 주문하기 버튼 다시 활성화
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});


// ==========================================================
// 9. 다시 작성 (Form Reset) 이벤트 처리
// ==========================================================
// 다시 작성 버튼은 주문서만 초기화하고, 접수된 주문 내역(orders)은 지우지 않습니다.
orderForm.addEventListener("reset", function () {
  setTimeout(function () {
    // 예상 금액 0원으로 재계산 및 초기화
    calculateTotal();

    // 주문 확인 메시지 숨기기
    orderConfirmation.textContent = "";
    orderConfirmation.style.display = "none";
  }, 0);
});


// ==========================================================
// 10. 초기 화면 렌더링
// ==========================================================
// 최초 실행 시 주문 뱃지(0) 및 빈 주문 내역 메시지 세팅
renderOrders();
