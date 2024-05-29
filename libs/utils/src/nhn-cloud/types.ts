// Ref: https://docs.toast.com/ko/Notification/SMS/ko/api-guide/
export interface SmsResponse {
  header: {
    // 성공 여부
    isSuccessful: boolean;
    // 실패 코드
    resultCode: number;
    // 실패 메시지
    resultMessage: string;
  };

  body: {
    data: {
      // 요청 ID
      requestId: string;
      // 요청 상태 코드(1:요청 중, 2:요청 완료, 3:요청 실패)
      statusCode: string;
      // 발신자 그룹키
      senderGroupingKey: string;
      sendResultList: {
        // 수신 번호
        recipientNo: string;
        // 결과 코드
        resultCode: number;
        // 결과 메시지
        resultMessage: string;
        // 수신자 시퀀스(mtPr)
        recipientSeq: number;
        // 수신자 그룹키
        recipientGroupingKey: string;
      }[];
    };
  };
}
