import { DocumentType, Gender } from '../enums/user.enums';
export declare class RegisterDto {
    firstName: string;
    lastName: string;
    documentType: DocumentType;
    documentNumber: string;
    birthDate: string;
    gender?: Gender;
    email: string;
    emailConfirm: string;
    phone: string;
    password: string;
    passwordConfirm: string;
    cityId: string;
    favoriteCinemaId?: string;
    acceptPrivacy: boolean;
    acceptTerms: boolean;
    acceptMarketing?: boolean;
    captchaToken: string;
}
