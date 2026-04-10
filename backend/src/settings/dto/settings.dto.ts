import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateMultipleSettingsDto {
  settings: { key: string; value: string; label?: string }[];
}
