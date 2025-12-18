import { Controller, Post, Get, Put, Delete, UseGuards, UploadedFile, UseInterceptors, Request, Body, Param, Query, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { LabelService } from './label.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard';
import { Roles } from '../common/decorators';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('labels')
@ApiBearerAuth()
@Controller('labels')
@UseGuards(AuthGuard,WorkspaceRoleGuard)
export class LabelController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly labelService: LabelService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Roles('admin', 'reviewer')
  async uploadLabelFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body() body: CreateLabelDto,
  ) {
    const s3Url = await this.s3Service.uploadFile(file.buffer, file.originalname, file.mimetype);
    const presignedUrl = await this.s3Service.getPresignedUrl(file.originalname);
    const result = await this.labelService.createLabelWithFile(body.name, s3Url, body.workspaceId, presignedUrl);
    return result;
  }

  @Post(':id/upload-version')
  @UseInterceptors(FileInterceptor('file'))
  @Roles('admin', 'reviewer')
  async uploadLabelVersion(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') labelId: string,
  ) {
    const s3Url = await this.s3Service.uploadFile(file.buffer, file.originalname, file.mimetype);
    const presignedUrl = await this.s3Service.getPresignedUrl(file.originalname);
    const result = await this.labelService.createVersionForLabel(labelId, s3Url, presignedUrl);
    return result;
  }

  @Get()
  @Roles('admin', 'reviewer', 'viewer')
  async getAllLabels(@Request() req, @Query('workspaceId') workspaceId?: string) {
    const data = await this.labelService.getAllLabels(workspaceId);
    console.log('getAllLabels response (array):', data);
    if (Array.isArray(data)) {
      data.forEach((item, idx) => console.log(`Label[${idx}]:`, item));
    }
    return data;
  }

  @Get(':id')
  @Roles('admin', 'reviewer', 'viewer')
  async getLabelById(@Param('id') id: string) {
    return this.labelService.getLabelById(id);
  }

  @Put(':id')
  @Roles('admin', 'reviewer')
  async updateLabel(@Param('id') id: string, @Body() updateDto: UpdateLabelDto) {
    return this.labelService.updateLabel(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  async deleteLabel(@Param('id') id: string) {
    return this.labelService.deleteLabel(id);
  }

  @Get(':id/versions')
  @Roles('admin', 'reviewer', 'viewer')
  async getLabelVersions(@Param('id') id: string) {
    return this.labelService.getLabelVersions(id);
  }

  @Get(':id/versions/:versionId')
  @Roles('admin', 'reviewer', 'viewer')
  async getLabelVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.labelService.getLabelVersion(id, versionId);
  }

  @Get(':id/download')
  @Roles('admin', 'reviewer', 'viewer')
  async downloadLabel(@Param('id') id: string) {
    return this.labelService.getLabelDownloadUrl(id);
  }

  @Get(':id/preview')
  @Roles('admin', 'member', 'viewer')
  async previewLabel(@Param('id') id: string) {
    return this.labelService.getLabelPreviewUrl(id);
  }

  /**
   * Approve a label version (set status to APPROVED, optionally add a review comment)
   */
  @Put(':labelId/versions/:versionId/approve')
  @Roles('admin', 'reviewer')
  async approveLabelVersion(
    @Param('labelId') labelId: string,
    @Param('versionId') versionId: string,
    @Body('reviewComment') reviewComment?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.labelService.updateLabelVersionStatus(labelId, versionId, 'APPROVED', reviewComment, userId);
  }

  /**
   * Reject a label version (set status to REJECTED, optionally add a review comment)
   */
  @Put(':labelId/versions/:versionId/reject')
  @Roles('admin', 'reviewer')
  async rejectLabelVersion(
    @Param('labelId') labelId: string,
    @Param('versionId') versionId: string,
    @Body('reviewComment') reviewComment?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.labelService.updateLabelVersionStatus(labelId, versionId, 'REJECTED', reviewComment, userId);
  }
}
