import { Link } from 'react-router-dom';
import type { Job } from '../../types/job';
import StatusBadge from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: Job;
  className?: string;
}

const HOURS_24_MS = 24 * 60 * 60 * 1000;

const computeIsNew = (job: Job): boolean => {
  if (job.isNew !== undefined) return job.isNew;
  const firstSeen = new Date(job.firstSeenAt).getTime();
  return Date.now() - firstSeen < HOURS_24_MS;
};

const computeIsReactivated = (job: Job): boolean => {
  if (job.isReactivated !== undefined) return job.isReactivated;
  if (computeIsNew(job)) return false;
  const lastSeen = new Date(job.lastSeenAt).getTime();
  return Date.now() - lastSeen < HOURS_24_MS;
};

const JobCard = ({ job, className = '' }: JobCardProps) => {
  const isNew = computeIsNew(job);
  const isReactivated = computeIsReactivated(job);

  return (
    <Link
      to={`/${job.id}`}
      className={`${className} block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {job.company} • {job.location}
            </p>
          </div>
          <div className="flex space-x-2">
            {isNew && (
              <StatusBadge variant="new">NEW</StatusBadge>
            )}
            {isReactivated && (
              <StatusBadge variant="reactivated">REACTIVATED</StatusBadge>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-medium">Role</p>
            <p>{job.role}</p>
          </div>
          <div>
            <p className="font-medium">Source</p>
            <p>{job.sourceType}</p>
          </div>
          <div>
            <p className="font-medium">Confidence</p>
            <p>{Math.round(job.confidenceScore * 100)}%</p>
          </div>
          <div>
            <p className="font-medium">Last Seen</p>
            <p>{formatDistanceToNow(new Date(job.lastSeenAt), { addSuffix: true })}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a
            href={job.externalApplyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Apply externally →
          </a>
        </div>
      </div>
    </Link>
  );
};

export default JobCard;