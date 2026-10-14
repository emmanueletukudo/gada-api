export class ApiResponseDto<T> {
  success: boolean;
  message: string;
  data: T;

  constructor(data: T, message = 'Request successful') {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}
