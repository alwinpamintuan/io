import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { DeviceId, SceneRoute } from '../app/state';

export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
  readonly fov: number;
  readonly roll: number;
}

function copyPose(pose: CameraPose): CameraPose {
  return { ...pose, position: pose.position.clone(), target: pose.target.clone() };
}

export function createOverviewPose(): CameraPose {
  // Sheet §8.1 direction/FOV; 15% pullback and +5 cm target height keep the
  // renderer spike clear of the top edge. All geometry shares this projection.
  return {
    position: new Vector3(126.5, -506.75, 255),
    target: new Vector3(0, 5, 25),
    fov: 11,
    roll: 0,
  };
}

export class CameraRig {
  readonly camera = new PerspectiveCamera(11, 1, 1, 2000);
  private readonly overview: CameraPose;
  private readonly focusPoses = new Map<DeviceId, CameraPose>();
  private readonly target = new Vector3();
  private readonly interpolatedPosition = new Vector3();
  private readonly interpolatedTarget = new Vector3();
  private roll = 0;

  constructor(overview: CameraPose = createOverviewPose()) {
    this.overview = copyPose(overview);
    this.applyPose(this.overview);
  }

  registerFocusPose(device: DeviceId, pose: CameraPose): void {
    this.focusPoses.set(device, copyPose(pose));
  }

  poseFor(route: SceneRoute): CameraPose {
    const pose = copyPose(route === null ? this.overview : this.focusPoses.get(route) ?? this.overview);
    if (route === null) {
      const factor = this.camera.aspect < 1.3 ? 1.3 / Math.max(0.5, this.camera.aspect)
        : this.camera.aspect > 2 ? this.camera.aspect / 2 : 1;
      pose.position.sub(pose.target).multiplyScalar(factor).add(pose.target);
    }
    return pose;
  }

  snapshot(): CameraPose {
    return {
      position: this.camera.position.clone(), target: this.target.clone(),
      fov: this.camera.fov, roll: this.roll,
    };
  }

  resize(width: number, height: number): void {
    this.camera.aspect = Math.max(1, width) / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  interpolate(from: CameraPose, to: CameraPose, progress: number): void {
    const t = MathUtils.clamp(progress, 0, 1);
    this.applyPose({
      position: this.interpolatedPosition.lerpVectors(from.position, to.position, t),
      target: this.interpolatedTarget.lerpVectors(from.target, to.target, t),
      fov: MathUtils.lerp(from.fov, to.fov, t),
      roll: MathUtils.lerp(from.roll, to.roll, t),
    });
  }

  applyPose(pose: CameraPose): void {
    this.camera.position.copy(pose.position);
    this.target.copy(pose.target);
    this.roll = pose.roll;
    // Shared convention: X across the desk, Y toward its rear, Z vertical.
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(this.target);
    this.camera.rotateZ(pose.roll);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
}
